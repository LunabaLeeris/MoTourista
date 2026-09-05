-- Materialized user badge progress table and event-driven trigger system

create table if not exists public.user_badge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  current_progress int not null default 0,
  target_progress int not null default 1,
  progress_percentage numeric(5, 2) not null default 0.00,
  is_unlocked boolean not null default false,
  is_pinned boolean default false,
  acquired_at timestamptz,
  progress_data jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  unique (user_id, badge_id)
);

-- Performance indexes
create index if not exists idx_user_badge_progress_user_id on public.user_badge_progress(user_id);
create index if not exists idx_user_badge_progress_badge_id on public.user_badge_progress(badge_id);

-- Enable Row Level Security
alter table public.user_badge_progress enable row level security;

-- Grants
grant select on table public.user_badge_progress to anon, authenticated, service_role;
grant all on table public.user_badge_progress to authenticated, service_role;

-- Policies
create policy "Allow public read access to user_badge_progress"
  on public.user_badge_progress for select
  using (true);

create policy "Users can update their own badge pinning on user_badge_progress"
  on public.user_badge_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Core calculation function for a single badge and user
create or replace function public.calculate_user_badge_progress(
  p_user_id uuid,
  p_badge record
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_item jsonb;
  v_tag_id text;
  v_threshold int;
  v_tag_count int;
  v_total_current int := 0;
  v_total_target int := 0;
  v_all_criteria_met boolean := true;
  v_progress_breakdown jsonb := '[]'::jsonb;
  v_now timestamptz := timezone('utc'::text, now());
  v_is_already_unlocked boolean := false;
  v_existing_acquired_at timestamptz := null;
  v_existing_is_pinned boolean := false;
begin
  -- Check existing progress and unlock state
  select is_unlocked, acquired_at, is_pinned
  into v_is_already_unlocked, v_existing_acquired_at, v_existing_is_pinned
  from public.user_badge_progress
  where user_id = p_user_id and badge_id = p_badge.id;

  -- Process criteria_data formatted as array of 2-length tuples: [[tag_id, threshold], ...]
  if jsonb_typeof(p_badge.criteria_data) = 'array' then
    for v_item in select * from jsonb_array_elements(p_badge.criteria_data)
    loop
      v_tag_id := v_item->>0;
      v_threshold := coalesce((v_item->>1)::int, 1);

      if v_tag_id = '*' or p_badge.criteria_type = 'total_visits' then
        select count(distinct location_id) into v_tag_count
        from public.location_visits
        where user_id = p_user_id;
      else
        select count(distinct lv.location_id) into v_tag_count
        from public.location_visits lv
        join public.location_tags lt on lt.location_id = lv.location_id
        where lv.user_id = p_user_id
          and lt.tag_id = v_tag_id;
      end if;

      v_total_target := v_total_target + v_threshold;
      v_total_current := v_total_current + least(v_tag_count, v_threshold);

      if v_tag_count < v_threshold then
        v_all_criteria_met := false;
      end if;

      -- Store only the tag_id and the actual visit count ('current')
      v_progress_breakdown := v_progress_breakdown || jsonb_build_object(
        'tag_id', v_tag_id,
        'current', v_tag_count
      );
    end loop;
  else
    -- Fallback compatibility for legacy object format {"threshold": N, "tag_id": "..."}
    v_threshold := coalesce((p_badge.criteria_data->>'threshold')::int, 1);
    v_tag_id := p_badge.criteria_data->>'tag_id';
    v_total_target := v_threshold;

    if v_tag_id is not null and p_badge.criteria_type = 'tag_visits' then
      select count(distinct lv.location_id) into v_tag_count
      from public.location_visits lv
      join public.location_tags lt on lt.location_id = lv.location_id
      where lv.user_id = p_user_id
        and lt.tag_id = v_tag_id;
    else
      select count(distinct location_id) into v_tag_count
      from public.location_visits
      where user_id = p_user_id;
    end if;

    v_total_current := least(v_tag_count, v_threshold);
    v_all_criteria_met := (v_tag_count >= v_threshold);
    v_progress_breakdown := jsonb_build_array(jsonb_build_object(
      'tag_id', coalesce(v_tag_id, '*'),
      'current', v_tag_count
    ));
  end if;

  if v_total_target <= 0 then
    v_total_target := 1;
  end if;

  -- Once unlocked, retain unlocked state and timestamp
  if coalesce(v_is_already_unlocked, false) or v_all_criteria_met then
    v_all_criteria_met := true;
    v_total_current := v_total_target;
    if v_existing_acquired_at is null then
      v_existing_acquired_at := v_now;
    end if;
  end if;

  insert into public.user_badge_progress (
    user_id,
    badge_id,
    current_progress,
    target_progress,
    progress_percentage,
    is_unlocked,
    is_pinned,
    acquired_at,
    progress_data,
    updated_at
  )
  values (
    p_user_id,
    p_badge.id,
    v_total_current,
    v_total_target,
    round((v_total_current::numeric / v_total_target::numeric) * 100, 2),
    v_all_criteria_met,
    coalesce(v_existing_is_pinned, false),
    v_existing_acquired_at,
    v_progress_breakdown,
    v_now
  )
  on conflict (user_id, badge_id) do update set
    current_progress = excluded.current_progress,
    target_progress = excluded.target_progress,
    progress_percentage = excluded.progress_percentage,
    is_unlocked = excluded.is_unlocked,
    acquired_at = coalesce(public.user_badge_progress.acquired_at, excluded.acquired_at),
    progress_data = excluded.progress_data,
    updated_at = excluded.updated_at;
end;
$$;

-- Stored procedure to recalculate all badges for a user on demand
create or replace function public.recalculate_user_badges(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_badge record;
begin
  for v_badge in select * from public.badges loop
    perform public.calculate_user_badge_progress(p_user_id, v_badge);
  end loop;
end;
$$;

-- Trigger function on location_visits to evaluate affected badges incrementally
create or replace function public.evaluate_rider_badges()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_badge record;
  v_visited_tags text[];
begin
  -- Retrieve tags for the newly visited location
  select coalesce(array_agg(tag_id), '{}'::text[]) into v_visited_tags
  from public.location_tags
  where location_id = new.location_id;

  -- Evaluate affected badges:
  -- Total visit badges OR badges whose criteria_data references any of the location's tags
  for v_badge in
    select b.*
    from public.badges b
    where b.criteria_type = 'total_visits'
       or exists (
         select 1
         from jsonb_array_elements(b.criteria_data) elem
         where elem->>0 = '*'
            or elem->>0 = any(v_visited_tags)
       )
       or b.criteria_data->>'tag_id' = any(v_visited_tags)
  loop
    perform public.calculate_user_badge_progress(new.user_id, v_badge);
  end loop;

  return new;
end;
$$;

-- Attach trigger to location_visits
drop trigger if exists on_location_visit_awarded on public.location_visits;
create trigger on_location_visit_awarded
  after insert on public.location_visits
  for each row execute function public.evaluate_rider_badges();
