-- Location verification statuses and hotspot tags lookup tables

create table if not exists public.location_statuses (
  id text primary key,
  label text not null,
  description text default '',
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.tags (
  id text primary key,
  name text not null,
  icon text not null,
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.location_statuses enable row level security;
alter table public.tags enable row level security;

-- Grants
grant select on table public.location_statuses to anon, authenticated, service_role;
grant select on table public.tags to anon, authenticated, service_role;
grant all on table public.location_statuses to authenticated, service_role;
grant all on table public.tags to authenticated, service_role;

-- Public read policies
create policy "Allow public read access to location_statuses"
  on public.location_statuses for select
  using (true);

create policy "Allow public read access to tags"
  on public.tags for select
  using (true);
