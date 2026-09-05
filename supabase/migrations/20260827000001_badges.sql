-- Badges and achievements definition table

create table if not exists public.badges (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  category text not null default 'visits',
  criteria_type text not null,
  criteria_data jsonb not null default '[]'::jsonb,
  is_secret boolean default false,
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.badges enable row level security;

-- Grants
grant select on table public.badges to anon, authenticated, service_role;
grant all on table public.badges to authenticated, service_role;

-- Read policy
create policy "Allow public read access to badges"
  on public.badges for select
  using (true);
