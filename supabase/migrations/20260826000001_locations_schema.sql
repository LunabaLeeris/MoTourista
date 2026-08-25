-- Location discovery, pinning, media, tags, visits, hearts, reviews, and moderation schema.

-- Enable the UUID extension if not already enabled.
create extension if not exists "uuid-ossp";

-- Create the location statuses lookup table.
create table if not exists public.location_statuses (
  id text primary key,
  label text not null,
  description text default '',
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create the tags lookup table.
create table if not exists public.tags (
  id text primary key,
  name text not null,
  icon text not null,
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create the locations table for map pins and rider hotspots.
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

-- Create the location images gallery table.
create table if not exists public.location_images (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  image_url text not null,
  caption text default '',
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create the location tags junction table with description.
create table if not exists public.location_tags (
  location_id uuid not null references public.locations(id) on delete cascade,
  tag_id text not null references public.tags(id) on delete cascade,
  description text default '',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (location_id, tag_id)
);

-- Create the location hearts table.
create table if not exists public.location_hearts (
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (location_id, user_id)
);

-- Create the location visits table for recent visitors.
create table if not exists public.location_visits (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  visited_at timestamptz default timezone('utc'::text, now()) not null,
  notes text default '',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create the reviews table.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  description text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create the review images table.
create table if not exists public.review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  image_url text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security on all newly created tables.
alter table public.location_statuses enable row level security;
alter table public.tags enable row level security;
alter table public.locations enable row level security;
alter table public.location_images enable row level security;
alter table public.location_tags enable row level security;
alter table public.location_hearts enable row level security;
alter table public.location_visits enable row level security;
alter table public.reviews enable row level security;
alter table public.review_images enable row level security;

-- Grant permissions to anon, authenticated, and service_role.
grant select on table public.location_statuses to anon, authenticated, service_role;
grant select on table public.tags to anon, authenticated, service_role;
grant select on table public.locations to anon, authenticated, service_role;
grant select on table public.location_images to anon, authenticated, service_role;
grant select on table public.location_tags to anon, authenticated, service_role;
grant select on table public.location_hearts to anon, authenticated, service_role;
grant select on table public.location_visits to anon, authenticated, service_role;
grant select on table public.reviews to anon, authenticated, service_role;
grant select on table public.review_images to anon, authenticated, service_role;

grant all on table public.location_statuses to authenticated, service_role;
grant all on table public.tags to authenticated, service_role;
grant all on table public.locations to authenticated, service_role;
grant all on table public.location_images to authenticated, service_role;
grant all on table public.location_tags to authenticated, service_role;
grant all on table public.location_hearts to authenticated, service_role;
grant all on table public.location_visits to authenticated, service_role;
grant all on table public.reviews to authenticated, service_role;
grant all on table public.review_images to authenticated, service_role;

-- Define RLS policies.
-- Read access policies.
create policy "Allow public read access to location_statuses" on public.location_statuses for select using (true);
create policy "Allow public read access to tags" on public.tags for select using (true);
create policy "Allow public read access to locations" on public.locations for select using (true);
create policy "Allow public read access to location_images" on public.location_images for select using (true);
create policy "Allow public read access to location_tags" on public.location_tags for select using (true);
create policy "Allow public read access to location_hearts" on public.location_hearts for select using (true);
create policy "Allow public read access to location_visits" on public.location_visits for select using (true);
create policy "Allow public read access to reviews" on public.reviews for select using (true);
create policy "Allow public read access to review_images" on public.review_images for select using (true);

-- Mutation policies for locations.
-- Users can only modify or remove locations before administrator approval.
create policy "Authenticated users can insert locations" on public.locations for insert to authenticated with check (auth.uid() = created_by);
create policy "Users can update their own locations" on public.locations for update to authenticated using (auth.uid() = created_by and status_id != 'approved');
create policy "Users can delete their own locations" on public.locations for delete to authenticated using (auth.uid() = created_by and status_id != 'approved');

-- Mutation policies for location images.
-- Users can only modify media for locations before administrator approval.
create policy "Users can manage images for their locations" on public.location_images for all to authenticated
  using (exists (select 1 from public.locations where id = location_images.location_id and created_by = auth.uid() and status_id != 'approved'))
  with check (exists (select 1 from public.locations where id = location_images.location_id and created_by = auth.uid() and status_id != 'approved'));

-- Mutation policies for location tags.
-- Users can only modify tag associations for locations before administrator approval.
create policy "Users can manage tags for their locations" on public.location_tags for all to authenticated
  using (exists (select 1 from public.locations where id = location_tags.location_id and created_by = auth.uid() and status_id != 'approved'))
  with check (exists (select 1 from public.locations where id = location_tags.location_id and created_by = auth.uid() and status_id != 'approved'));

-- Mutation policies for hearts.
create policy "Users can heart locations" on public.location_hearts for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can unheart locations" on public.location_hearts for delete to authenticated using (auth.uid() = user_id);

-- Mutation policies for visits.
create policy "Users can log visits" on public.location_visits for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete their visits" on public.location_visits for delete to authenticated using (auth.uid() = user_id);

-- Mutation policies for reviews.
create policy "Users can create reviews" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own reviews" on public.reviews for update to authenticated using (auth.uid() = user_id);
create policy "Users can delete their own reviews" on public.reviews for delete to authenticated using (auth.uid() = user_id);

-- Mutation policies for review images.
create policy "Users can manage images for their reviews" on public.review_images for all to authenticated
  using (exists (select 1 from public.reviews where id = review_images.review_id and user_id = auth.uid()))
  with check (exists (select 1 from public.reviews where id = review_images.review_id and user_id = auth.uid()));

-- Storage buckets for location and review photos.
insert into storage.buckets (id, name, public) values ('location_photos', 'location_photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('review_photos', 'review_photos', true) on conflict (id) do nothing;

create policy "Location photos are publicly accessible" on storage.objects for select using (bucket_id = 'location_photos');
create policy "Authenticated users can upload location photos" on storage.objects for insert to authenticated with check (bucket_id = 'location_photos');
create policy "Users can update their location photos" on storage.objects for update to authenticated using (bucket_id = 'location_photos' and auth.uid() = owner);

create policy "Review photos are publicly accessible" on storage.objects for select using (bucket_id = 'review_photos');
create policy "Authenticated users can upload review photos" on storage.objects for insert to authenticated with check (bucket_id = 'review_photos');
create policy "Users can update their review photos" on storage.objects for update to authenticated using (bucket_id = 'review_photos' and auth.uid() = owner);
