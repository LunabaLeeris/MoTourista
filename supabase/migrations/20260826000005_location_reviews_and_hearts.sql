-- Location favorites (hearts), ratings, reviews, and review images

create table if not exists public.location_hearts (
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (location_id, user_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  description text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  image_url text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.location_hearts enable row level security;
alter table public.reviews enable row level security;
alter table public.review_images enable row level security;

-- Grants
grant select on table public.location_hearts to anon, authenticated, service_role;
grant select on table public.reviews to anon, authenticated, service_role;
grant select on table public.review_images to anon, authenticated, service_role;
grant all on table public.location_hearts to authenticated, service_role;
grant all on table public.reviews to authenticated, service_role;
grant all on table public.review_images to authenticated, service_role;

-- Read policies
create policy "Allow public read access to location_hearts"
  on public.location_hearts for select
  using (true);

create policy "Allow public read access to reviews"
  on public.reviews for select
  using (true);

create policy "Allow public read access to review_images"
  on public.review_images for select
  using (true);

-- Hearts mutation policies
create policy "Users can heart locations"
  on public.location_hearts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can unheart locations"
  on public.location_hearts for delete
  to authenticated
  using (auth.uid() = user_id);

-- Reviews mutation policies
create policy "Users can create reviews"
  on public.reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own reviews"
  on public.reviews for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own reviews"
  on public.reviews for delete
  to authenticated
  using (auth.uid() = user_id);

-- Review images policies
create policy "Users can manage images for their reviews"
  on public.review_images for all
  to authenticated
  using (exists (select 1 from public.reviews where id = review_images.review_id and user_id = auth.uid()))
  with check (exists (select 1 from public.reviews where id = review_images.review_id and user_id = auth.uid()));

-- Review photos storage bucket
insert into storage.buckets (id, name, public)
values ('review_photos', 'review_photos', true)
on conflict (id) do nothing;

create policy "Review photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'review_photos');

create policy "Authenticated users can upload review photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'review_photos');

create policy "Users can update their review photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'review_photos' and auth.uid() = owner);
