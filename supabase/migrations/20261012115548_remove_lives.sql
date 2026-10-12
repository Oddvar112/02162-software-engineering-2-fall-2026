
create or replace function public.submit_program(p_game_id uuid, p_card_ids text[])
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
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_game from games where id = p_game_id for update;

  if not found then
    raise exception 'game_not_found';
  end if;

  if v_game.phase <> 'programming' then
    raise exception 'not_programming_phase';
  end if;

  select * into v_player
  from game_players
  where game_id = p_game_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'not_in_game';
  end if;

  if exists (
    select 1 from programs
    where game_id = p_game_id and user_id = auth.uid() and round = v_game.round
  ) then
    raise exception 'already_locked_in';
  end if;

  if coalesce(array_length(p_card_ids, 1), 0) <> 5 then
    raise exception 'wrong_card_count';
  end if;

  if (select count(distinct id) from unnest(p_card_ids) as id) <> 5 then
    raise exception 'duplicate_card';
  end if;

  select * into v_hand
  from hands
  where game_id = p_game_id and user_id = auth.uid() and round = v_game.round;

  if not found then
    raise exception 'no_hand';
  end if;

  select jsonb_agg(card order by ordinality) into v_program
  from unnest(p_card_ids) with ordinality as chosen(id, ordinality)
  join jsonb_array_elements(v_hand.cards) as card on card ->> 'id' = chosen.id;

  if v_program is null or jsonb_array_length(v_program) <> 5 then
    raise exception 'card_not_in_hand';
  end if;

  insert into programs (game_id, user_id, round, cards)
  values (p_game_id, auth.uid(), v_game.round, v_program)
  on conflict (game_id, user_id) do update
    set round = excluded.round, cards = excluded.cards;

  update games
  set updated_at = now(),
      timer_started_at = coalesce(timer_started_at, now())
  where id = p_game_id;
end;
$$;

revoke all on function public.submit_program(uuid, text[]) from public;
grant execute on function public.submit_program(uuid, text[]) to authenticated;

create or replace function public.apply_round_result(
  p_game_id uuid,
  p_round integer,
  p_expected_updated_at timestamptz,
  p_phase text,
  p_execution_log jsonb,
  p_execution_frames jsonb,
  p_players jsonb,
  p_programs jsonb,
  p_discarded jsonb,
  p_winner_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games;
  v_player jsonb;
  v_program jsonb;
  v_discardpile jsonb;
begin
  select * into v_game from games where id = p_game_id for update;

  if not found
     or v_game.phase <> 'programming'
     or v_game.round <> p_round
     or v_game.updated_at <> p_expected_updated_at then
    return false;
  end if;

  for v_player in select * from jsonb_array_elements(p_players) loop
    update game_players
    set x = (v_player ->> 'x')::integer,
        z = (v_player ->> 'z')::integer,
        direction = (v_player ->> 'direction')::integer,
        checkpoints_reached = (v_player ->> 'checkpoints_reached')::integer
    where game_id = p_game_id and user_id = (v_player ->> 'user_id')::uuid;
  end loop;

  for v_program in select * from jsonb_array_elements(p_programs) loop
    insert into programs (game_id, user_id, round, cards)
    values (p_game_id, (v_program ->> 'user_id')::uuid, p_round, v_program -> 'cards')
    on conflict (game_id, user_id) do update
      set round = excluded.round, cards = excluded.cards;
  end loop;

  for v_discardpile in select * from jsonb_array_elements(p_discarded) loop
    update game_players
    set discard_pile = discard_pile || (v_discardpile -> 'cards')
    where game_id = p_game_id and user_id = (v_discardpile ->> 'user_id')::uuid;
  end loop;

  if p_phase = 'finished' then
    update lobbies set status = 'finished' where game = p_game_id;
  end if;

  update games
  set phase = p_phase,
      execution_log = p_execution_log,
      execution_frames = p_execution_frames,
      winner_id = p_winner_id,
      updated_at = now()
  where id = p_game_id;

  return true;
end;
$$;

alter table public.game_players drop column lives;
