-- Enable the UUID extension.
create extension if not exists "uuid-ossp";

-- Create the driver types lookup table.
create table if not exists public.driver_types (
  id text primary key,
  label text not null,
  icon text not null,
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create the vehicle types lookup table.
create table if not exists public.vehicle_types (
  id text primary key,
  label text not null,
  icon text not null,
  display_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable row level security on lookup tables.
alter table public.driver_types enable row level security;
alter table public.vehicle_types enable row level security;

-- Allow public read access to driver types.
create policy "Allow read access to driver_types"
  on public.driver_types for select
  using (true);

-- Allow public read access to vehicle types.
create policy "Allow read access to vehicle_types"
  on public.vehicle_types for select
  using (true);

-- Create the profiles table.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text default '',
  avatar_url text default '',
  location_name text default '',
  latitude numeric,
  longitude numeric,
  driver_type_id text references public.driver_types(id) on update cascade on delete set null,
  vehicle_type_id text references public.vehicle_types(id) on update cascade on delete set null,
  is_onboarded boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable row level security on the profiles table.
alter table public.profiles enable row level security;

-- Define access policies for the profiles table.
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

-- Define the trigger function for new user profiles.
-- The function copies user data into the profiles table during registration.
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

-- Attach the trigger to the users table in the auth schema.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create the storage bucket for user profile photos.
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
