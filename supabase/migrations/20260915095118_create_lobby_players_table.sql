create table public.lobby_players (
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamp with time zone not null default now(),
  primary key (lobby_id, user_id)
);

-- Enable RLS
alter table public.lobby_players enable row level security;

-- RLS policy: anyone can select players in any lobby
create policy "lobby_players_select" on public.lobby_players
  for select using (true);

-- RLS policy: authenticated users can insert (join a lobby)
create policy "lobby_players_insert" on public.lobby_players
  for insert with check (auth.uid() = user_id);

-- RLS policy: only the player themselves can delete their own entry
create policy "lobby_players_delete" on public.lobby_players
  for delete using (auth.uid() = user_id);
