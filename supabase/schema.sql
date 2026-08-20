-- FrameTap Supabase setup
-- 1. Enable Auth > Sign In / Providers > Anonymous sign-ins in the Supabase dashboard.
-- 2. Run this SQL in the Supabase SQL editor.
-- 3. Add your project values to the hosting environment variables from .env.example.

create table if not exists public.albums (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  destination text not null,
  dates text not null,
  description text default '',
  story text default '',
  favorite_memory text default '',
  people text default '',
  photos jsonb not null default '[]'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.albums enable row level security;

drop policy if exists "Public albums are readable" on public.albums;
create policy "Public albums are readable"
on public.albums
for select
to anon, authenticated
using (is_public or owner_id = (select auth.uid()));

drop policy if exists "Authenticated users can create their albums" on public.albums;
create policy "Authenticated users can create their albums"
on public.albums
for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Album owners can update their albums" on public.albums;
create policy "Album owners can update their albums"
on public.albums
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Album owners can delete their albums" on public.albums;
create policy "Album owners can delete their albums"
on public.albums
for delete
to authenticated
using (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('album-photos', 'album-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can view public album photos" on storage.objects;
create policy "Anyone can view public album photos"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'album-photos');

drop policy if exists "Users can upload photos to their folder" on storage.objects;
create policy "Users can upload photos to their folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'album-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update photos in their folder" on storage.objects;
create policy "Users can update photos in their folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'album-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'album-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete photos in their folder" on storage.objects;
create policy "Users can delete photos in their folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'album-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
