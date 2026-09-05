-- Location tags junction table associating locations with tags

create table if not exists public.location_tags (
  location_id uuid not null references public.locations(id) on delete cascade,
  tag_id text not null references public.tags(id) on delete cascade,
  description text default '',
  created_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (location_id, tag_id)
);

-- Enable Row Level Security
alter table public.location_tags enable row level security;

-- Grants
grant select on table public.location_tags to anon, authenticated, service_role;
grant all on table public.location_tags to authenticated, service_role;

-- Policies
create policy "Allow public read access to location_tags"
  on public.location_tags for select
  using (true);

create policy "Users can manage tags for their locations"
  on public.location_tags for all
  to authenticated
  using (exists (select 1 from public.locations where id = location_tags.location_id and created_by = auth.uid() and status_id != 'approved'))
  with check (exists (select 1 from public.locations where id = location_tags.location_id and created_by = auth.uid() and status_id != 'approved'));
