-- Create games table
create table games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);


-- Truncate lobbies because of not null constraint given on the new column
truncate lobbies cascade;

alter table lobbies
  add column game uuid not null references games(id) on delete cascade;


-- Add function create_lobby_with_game() to streamline db changes
create or replace function create_lobby_with_game()
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_game_id  uuid;
  v_lobby_id uuid;
begin
  if v_user_id is null then
    raise exception 'create_lobby_with_game: not authenticated';
  end if;

  insert into games default values
  returning id into v_game_id;

  insert into lobbies (created_by, max_players, game)
  values (v_user_id, 8, v_game_id)
  returning id into v_lobby_id;

  insert into lobby_players (lobby_id, user_id)
  values (v_lobby_id, v_user_id);

  return v_lobby_id;
end;
$$;
