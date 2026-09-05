-- Motorcycle models lookup table categorized by vehicle type

create table if not exists public.motorcycle_models (
  id text primary key,
  vehicle_type_id text not null references public.vehicle_types(id) on update cascade on delete cascade,
  label text not null,
  icon text not null default 'motorbike',
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.motorcycle_models enable row level security;

-- Grants
grant select on table public.motorcycle_models to anon, authenticated, service_role;

-- Public read policy
create policy "Allow read access to motorcycle_models"
  on public.motorcycle_models for select
  using (true);
