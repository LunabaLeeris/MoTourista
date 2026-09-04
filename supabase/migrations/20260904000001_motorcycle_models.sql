-- Create the motorcycle models lookup table.
create table if not exists public.motorcycle_models (
  id text primary key,
  vehicle_type_id text not null references public.vehicle_types(id) on update cascade on delete cascade,
  label text not null,
  icon text not null default 'motorbike',
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable row level security on motorcycle_models.
alter table public.motorcycle_models enable row level security;

-- Allow public read access to motorcycle models.
create policy "Allow read access to motorcycle_models"
  on public.motorcycle_models for select
  using (true);

-- Grant table access permissions to anon, authenticated, and service_role.
grant select on table public.motorcycle_models to anon, authenticated, service_role;

-- Add motorcycle_model_id to profiles table.
alter table public.profiles
  add column if not exists motorcycle_model_id text
  references public.motorcycle_models(id) on update cascade on delete set null;
