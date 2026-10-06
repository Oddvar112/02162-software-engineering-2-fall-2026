alter table public.game_players
  add column reboot_token_id text;

create or replace function public.apply_round_result(
  p_game_id uuid,
  p_round integer,
  p_expected_updated_at timestamptz,
  p_phase text,
  p_execution_log jsonb,
  p_execution_frames jsonb,
  p_players jsonb,
  p_programs jsonb,
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
        reboot_token_id = v_player ->> 'reboot_token_id',
        checkpoints_reached = (v_player ->> 'checkpoints_reached')::integer
    where game_id = p_game_id and user_id = (v_player ->> 'user_id')::uuid;
  end loop;

  for v_program in select * from jsonb_array_elements(p_programs) loop
    insert into programs (game_id, user_id, round, cards)
    values (p_game_id, (v_program ->> 'user_id')::uuid, p_round, v_program -> 'cards')
    on conflict (game_id, user_id) do update
      set round = excluded.round, cards = excluded.cards;
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
