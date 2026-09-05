-- Extension and initial rider vehicle & license lookup tables

create extension if not exists "uuid-ossp";

-- Driver license types lookup table
create table if not exists public.driver_types (
  id text primary key,
  label text not null,
  icon text not null,
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Motorcycle vehicle categories lookup table
create table if not exists public.vehicle_types (
  id text primary key,
  label text not null,
  icon text not null,
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.driver_types enable row level security;
alter table public.vehicle_types enable row level security;

-- Grants
grant select on table public.driver_types to anon, authenticated, service_role;
grant select on table public.vehicle_types to anon, authenticated, service_role;

-- Public read policies
create policy "Allow read access to driver_types"
  on public.driver_types for select
  using (true);

create policy "Allow read access to vehicle_types"
  on public.vehicle_types for select
  using (true);
