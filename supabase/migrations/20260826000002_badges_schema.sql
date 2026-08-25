-- Declarative badge and achievement system schema.

-- Enable the UUID extension.
create extension if not exists "uuid-ossp";

-- Create the badges definition table.
create table if not exists public.badges (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  category text not null default 'visits',
  criteria_type text not null,
  criteria_data jsonb not null default '{}'::jsonb,
  is_secret boolean default false,
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create the user badges ownership table.
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  is_pinned boolean default false,
  acquired_at timestamptz default timezone('utc'::text, now()) not null,
  progress_data jsonb default '{}'::jsonb,
  unique (user_id, badge_id)
);

-- Enable Row Level Security.
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- Grant table permissions to anon, authenticated, and service_role.
grant select on table public.badges to anon, authenticated, service_role;
grant select on table public.user_badges to anon, authenticated, service_role;
grant all on table public.badges to authenticated, service_role;
grant all on table public.user_badges to authenticated, service_role;

-- Read access policies.
create policy "Allow public read access to badges" on public.badges for select using (true);
create policy "Allow public read access to user_badges" on public.user_badges for select using (true);

-- Mutation policies for user badges.
-- Riders can update badge pinning preference for their own profile.
create policy "Users can update their own badge pinning" on public.user_badges
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Define the badge evaluation trigger function.
-- The function evaluates unlocked badges when a visit is inserted.
create or replace function public.evaluate_rider_badges()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := new.user_id;
  v_total_visits int;
  v_badge record;
  v_tag_id text;
  v_threshold int;
  v_count int;
begin
  -- Calculate the total visits for the rider.
  select count(*) into v_total_visits
  from public.location_visits
  where user_id = v_user_id;

  -- Evaluate total visit milestone badges.
  for v_badge in
    select * from public.badges
    where criteria_type = 'total_visits'
      and (criteria_data->>'threshold')::int <= v_total_visits
      and id not in (select badge_id from public.user_badges where user_id = v_user_id)
  loop
    insert into public.user_badges (user_id, badge_id)
    values (v_user_id, v_badge.id)
    on conflict (user_id, badge_id) do nothing;
  end loop;

  -- Evaluate tag-specific visit badges.
  for v_badge in
    select * from public.badges
    where criteria_type = 'tag_visits'
      and id not in (select badge_id from public.user_badges where user_id = v_user_id)
  loop
    v_tag_id := v_badge.criteria_data->>'tag_id';
    v_threshold := coalesce((v_badge.criteria_data->>'threshold')::int, 0);

    if v_tag_id is not null and v_threshold > 0 then
      select count(distinct lv.location_id) into v_count
      from public.location_visits lv
      join public.location_tags lt on lt.location_id = lv.location_id
      where lv.user_id = v_user_id
        and lt.tag_id = v_tag_id;

      if v_count >= v_threshold then
        insert into public.user_badges (user_id, badge_id)
        values (v_user_id, v_badge.id)
        on conflict (user_id, badge_id) do nothing;
      end if;
    end if;
  end loop;

  return new;
end;
$$;

-- Attach the trigger to the location_visits table.
drop trigger if exists on_location_visit_awarded on public.location_visits;
create trigger on_location_visit_awarded
  after insert on public.location_visits
  for each row execute function public.evaluate_rider_badges();
