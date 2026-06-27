create extension if not exists pgcrypto;

alter table public.tracks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.tracks
  add column if not exists clicks integer not null default 0;

create index if not exists tracks_user_id_created_at_idx
  on public.tracks (user_id, created_at desc);

create index if not exists tracks_user_id_status_idx
  on public.tracks (user_id, status);

create index if not exists tracks_clicks_created_at_idx
  on public.tracks (clicks desc, created_at desc);

create or replace function public.increment_track_clicks(target_track_id uuid)
returns public.tracks
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_track public.tracks;
begin
  update public.tracks
  set clicks = coalesce(clicks, 0) + 1
  where tracks.id = target_track_id
  returning * into updated_track;

  return updated_track;
end;
$$;

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  tone text default 'blue',
  cover_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.playlist_tracks (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz default now(),
  primary key (playlist_id, track_id)
);

create index if not exists playlists_user_id_created_at_idx
  on public.playlists (user_id, created_at desc);

create index if not exists playlist_tracks_playlist_position_idx
  on public.playlist_tracks (playlist_id, position);
