alter table public.tracks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists tracks_user_id_created_at_idx
  on public.tracks (user_id, created_at desc);

create index if not exists tracks_user_id_status_idx
  on public.tracks (user_id, status);
