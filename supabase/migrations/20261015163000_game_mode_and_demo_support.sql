-- Add mode to games table
alter table public.games
  add column if not exists mode text not null default 'classic' check (mode in ('classic', 'demo'));

-- Grant service_role update on lobbies and full access on programs
grant select, update on public.lobbies to service_role;
grant select, insert, update, delete on public.programs to service_role;

-- Update start_lobby to allow single player for demo mode
create or replace function public.start_lobby(p_lobby_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby lobbies;
  v_game games;
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

  select * into v_game from games where id = v_lobby.game for update;

  if not found then
    raise exception 'game_not_found';
  end if;

  if v_game.mode <> 'demo' and (select count(*) from lobby_players where lobby_id = p_lobby_id) < v_lobby.min_players then
    raise exception 'not_enough_players';
  end if;

  if (select count(*) from lobby_players where lobby_id = p_lobby_id) < 1 then
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

-- Update submit_program to support demo mode variable card counts
create or replace function public.submit_program(
  p_game_id uuid,
  p_card_ids text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games;
  v_player game_players;
  v_hand hands;
  v_program jsonb;
  v_card_count integer;
  v_user_id uuid := auth.uid();
begin
  select * into v_game from games where id = p_game_id for update;

  if not found then
    raise exception 'game_not_found';
  end if;

  if v_game.phase <> 'programming' then
    raise exception 'not_programming_phase';
  end if;

  select * into v_player
  from game_players
  where game_id = p_game_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'not_in_game';
  end if;

  if exists (
    select 1 from programs
    where game_id = p_game_id and user_id = v_user_id and round = v_game.round
  ) then
    raise exception 'already_locked_in';
  end if;

  if v_player.lives = 0 then
    raise exception 'no_lives_left';
  end if;

  v_card_count := coalesce(array_length(p_card_ids, 1), 0);

  if v_game.mode <> 'demo' and v_card_count <> 5 then
    raise exception 'wrong_card_count';
  end if;

  if v_game.mode = 'demo' and v_card_count < 1 then
    raise exception 'wrong_card_count';
  end if;

  if (select count(distinct id) from unnest(p_card_ids) as id) <> v_card_count then
    raise exception 'duplicate_card';
  end if;

  select * into v_hand
  from hands
  where game_id = p_game_id and user_id = v_user_id and round = v_game.round;

  if not found then
    raise exception 'no_hand';
  end if;

  select jsonb_agg(card order by ordinality) into v_program
  from unnest(p_card_ids) with ordinality as chosen(id, ordinality)
  join jsonb_array_elements(v_hand.cards) as card on card ->> 'id' = chosen.id;

  if v_program is null or jsonb_array_length(v_program) <> v_card_count then
    raise exception 'card_not_in_hand';
  end if;

  insert into programs (game_id, user_id, round, cards)
  values (p_game_id, v_user_id, v_game.round, v_program)
  on conflict (game_id, user_id) do update
    set round = excluded.round, cards = excluded.cards;

  update games
  set updated_at = now(),
      timer_started_at = coalesce(timer_started_at, now())
  where id = p_game_id;
end;
$$;

revoke all on function public.submit_program(uuid, text[]) from public;
grant execute on function public.submit_program(uuid, text[]) to authenticated, service_role;
revoke all on function public.start_lobby(uuid) from public;
grant execute on function public.start_lobby(uuid) to authenticated, service_role;
