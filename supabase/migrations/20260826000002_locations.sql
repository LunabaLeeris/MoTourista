-- Rider hotspot locations and image gallery

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  address text default '',
  latitude numeric not null,
  longitude numeric not null,
  status_id text not null references public.location_statuses(id) default 'pending',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.location_images (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  image_url text not null,
  caption text default '',
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.locations enable row level security;
alter table public.location_images enable row level security;

-- Grants
grant select on table public.locations to anon, authenticated, service_role;
grant select on table public.location_images to anon, authenticated, service_role;
grant all on table public.locations to authenticated, service_role;
grant all on table public.location_images to authenticated, service_role;

-- Policies for locations
create policy "Allow public read access to locations"
  on public.locations for select
  using (true);

create policy "Authenticated users can insert locations"
  on public.locations for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Users can update their own locations"
  on public.locations for update
  to authenticated
  using (auth.uid() = created_by and status_id != 'approved');

create policy "Users can delete their own locations"
  on public.locations for delete
  to authenticated
  using (auth.uid() = created_by and status_id != 'approved');

-- Policies for location images
create policy "Allow public read access to location_images"
  on public.location_images for select
  using (true);

create policy "Users can manage images for their locations"
  on public.location_images for all
  to authenticated
  using (exists (select 1 from public.locations where id = location_images.location_id and created_by = auth.uid() and status_id != 'approved'))
  with check (exists (select 1 from public.locations where id = location_images.location_id and created_by = auth.uid() and status_id != 'approved'));

-- Storage bucket for location photos
insert into storage.buckets (id, name, public)
values ('location_photos', 'location_photos', true)
on conflict (id) do nothing;

create policy "Location photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'location_photos');

create policy "Authenticated users can upload location photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'location_photos');

create policy "Users can update their location photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'location_photos' and auth.uid() = owner);
