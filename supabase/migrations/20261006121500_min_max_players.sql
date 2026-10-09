-- Add min_players to lobbies table with default 2
alter table public.lobbies
  add column min_players integer not null default 2;

-- Check constraint: 2 <= min_players <= max_players <= 8
alter table public.lobbies
  add constraint lobbies_player_limits_check
  check (
    min_players >= 2
    and min_players <= max_players
    and max_players <= 8
  );

-- Update create_lobby_with_game to initialize with min 2 and max 8
drop function if exists public.create_lobby_with_game(integer, integer);

create or replace function public.create_lobby_with_game()
returns uuid
language plpgsql
security definer
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

  perform 1 from users where id = auth.uid() for update;

  if exists (
    select 1
    from lobby_players p
    join lobbies l on l.id = p.lobby_id
    where p.user_id = v_user_id and l.status in ('open', 'started')
  ) then
    raise exception 'already_in_a_lobby';
  end if;

  insert into games default values
  returning id into v_game_id;

  insert into lobbies (created_by, min_players, max_players, game)
  values (v_user_id, 2, 8, v_game_id)
  returning id into v_lobby_id;

  insert into lobby_players (lobby_id, user_id)
  values (v_lobby_id, v_user_id);

  return v_lobby_id;
end;
$$;

-- Function to allow creator to update lobby settings while open
create or replace function public.update_lobby_settings(
  p_lobby_id uuid,
  p_min_players integer,
  p_max_players integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby lobbies;
  v_player_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_lobby from lobbies where id = p_lobby_id for update;

  if not found then
    raise exception 'lobby_not_found';
  end if;

  if v_lobby.created_by is distinct from auth.uid() then
    raise exception 'not_creator';
  end if;

  if v_lobby.status <> 'open' then
    raise exception 'lobby_not_open';
  end if;

  if p_min_players is null or p_max_players is null then
    raise exception 'invalid_player_limits';
  end if;

  if p_min_players < 2 or p_max_players > 8 or p_min_players > p_max_players then
    raise exception 'invalid_player_limits';
  end if;

  select count(*) into v_player_count from lobby_players where lobby_id = p_lobby_id;

  if v_player_count > p_max_players then
    raise exception 'max_below_current_players';
  end if;

  update lobbies
  set min_players = p_min_players,
      max_players = p_max_players
  where id = p_lobby_id;
end;
$$;

revoke all on function public.update_lobby_settings(uuid, integer, integer) from public, anon;
grant execute on function public.update_lobby_settings(uuid, integer, integer) to authenticated;

-- Update start_lobby to enforce min_players
create or replace function public.start_lobby(p_lobby_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby lobbies;
begin
  select * into v_lobby from lobbies where id = p_lobby_id for update;

  if not found then
    raise exception 'lobby_not_found';
  end if;

  if v_lobby.created_by is distinct from auth.uid() then
    raise exception 'not_creator';
  end if;

  if v_lobby.status <> 'open' then
    raise exception 'already_started';
  end if;

  if (select count(*) from lobby_players where lobby_id = p_lobby_id) < v_lobby.min_players then
    raise exception 'not_enough_players';
  end if;

  if exists (
    select 1 from lobby_players
    where lobby_id = p_lobby_id and robot_model is null
  ) then
    raise exception 'robot_not_chosen';
  end if;

  update lobbies set status = 'started' where id = p_lobby_id;

  return v_lobby.game;
end;
$$;
