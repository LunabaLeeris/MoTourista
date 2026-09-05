-- Location visits table for logging rider stops and check-ins

create table if not exists public.location_visits (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  visited_at timestamptz default timezone('utc'::text, now()) not null,
  notes text default '',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.location_visits enable row level security;

-- Grants
grant select on table public.location_visits to anon, authenticated, service_role;
grant all on table public.location_visits to authenticated, service_role;

-- Policies
create policy "Allow public read access to location_visits"
  on public.location_visits for select
  using (true);

create policy "Users can log visits"
  on public.location_visits for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their visits"
  on public.location_visits for delete
  to authenticated
  using (auth.uid() = user_id);
