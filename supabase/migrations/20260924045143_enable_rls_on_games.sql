alter table public.games enable row level security;

create policy "games_select_member" on public.games
  for select to authenticated
  using (
    exists (
      select 1
      from public.lobbies l
      join public.lobby_players p on p.lobby_id = l.id
      where l.game = games.id and p.user_id = auth.uid()
    )
  );
