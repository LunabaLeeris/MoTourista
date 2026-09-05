-- Rider profiles table, registration trigger, and avatar storage

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text default '',
  avatar_url text default '',
  location_name text default '',
  latitude numeric,
  longitude numeric,
  driver_type_id text references public.driver_types(id) on update cascade on delete set null,
  vehicle_type_id text references public.vehicle_types(id) on update cascade on delete set null,
  motorcycle_model_id text references public.motorcycle_models(id) on update cascade on delete set null,
  is_onboarded boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Grants
grant all on table public.profiles to anon, authenticated, service_role;

-- Policies
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Trigger function to create a profile on user signup
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

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Avatars storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars."
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

create policy "Users can update their own avatars."
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and auth.uid() = owner);
