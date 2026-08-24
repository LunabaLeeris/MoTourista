-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text default '',
  avatar_url text default '',
  location_name text default '',
  latitude numeric,
  longitude numeric,
  driver_type text check (driver_type in ('student', 'non-pro', 'pro', 'none')) default 'none',
  vehicle_type text check (vehicle_type in ('scooter', 'underbone', 'backbone_manual', 'cruiser', 'adventure', 'sportbike', 'maxi_scooter', 'other')) default 'scooter',
  is_onboarded boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- 3. Procedural Trigger Function: handle_new_user
-- Automatically populates profile with OAuth (Google / Facebook) info or defaults upon signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    avatar_url,
    is_onboarded
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    false
  )
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url);

  return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Setup Storage Bucket for Avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly accessible." on storage.objects;
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload avatars." on storage.objects;
create policy "Authenticated users can upload avatars."
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "Users can update their own avatars." on storage.objects;
create policy "Users can update their own avatars."
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and auth.uid() = owner);
