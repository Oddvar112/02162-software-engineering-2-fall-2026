begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

insert into auth.users (id, email) values
  ('40000000-0000-4000-8000-000000000001', 'game-alice@example.test'),
  ('40000000-0000-4000-8000-000000000002', 'game-bob@example.test'),
  ('40000000-0000-4000-8000-000000000003', 'game-outsider@example.test');
insert into public.games (id, board) values
  ('50000000-0000-4000-8000-000000000001', '{"id":"t","width":2,"height":2,"tiles":[[{"kind":"floor"},{"kind":"floor"}],[{"kind":"floor"},{"kind":"floor"}]],"walls":[],"startpositions":[{"x":0,"y":1},{"x":1,"y":1}],"rebootToken":{"id":"reboot-token","position":{"x":0,"y":1}}}');
insert into public.lobbies (id, created_by, game, max_players, status) values
  ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 4, 'started');
insert into public.lobby_players (lobby_id, user_id) values
  ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002');
insert into public.game_players (game_id, user_id, seat, robot_model, x, z, direction) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 0, 'bolt', 0, 1, 1),
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 1, 'gizmo', 1, 1, 1);
insert into public.hands (game_id, user_id, round, cards) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 1,
   '[{"id":"a1","name":"Move 1","type":"move","value":1,"priority":10},{"id":"a2","name":"Move 1","type":"move","value":1,"priority":20},{"id":"a3","name":"Move 1","type":"move","value":1,"priority":30},{"id":"a4","name":"Move 1","type":"move","value":1,"priority":40},{"id":"a5","name":"Move 1","type":"move","value":1,"priority":50},{"id":"a6","name":"Move 1","type":"move","value":1,"priority":60}]'),
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 1,
   '[{"id":"b1","name":"Move 1","type":"move","value":1,"priority":11},{"id":"b2","name":"Move 1","type":"move","value":1,"priority":21},{"id":"b3","name":"Move 1","type":"move","value":1,"priority":31},{"id":"b4","name":"Move 1","type":"move","value":1,"priority":41},{"id":"b5","name":"Move 1","type":"move","value":1,"priority":51}]');

set local role authenticated;
set local request.jwt.claim.sub = '40000000-0000-4000-8000-000000000001';

select is(
  (select count(*) from public.game_players where game_id = '50000000-0000-4000-8000-000000000001'),
  2::bigint, 'a member sees every seat in the game'
);
select is(
  (select count(*) from public.hands where game_id = '50000000-0000-4000-8000-000000000001'),
  1::bigint, 'a player sees exactly one hand'
);
select is(
  (select user_id from public.hands where game_id = '50000000-0000-4000-8000-000000000001'),
  '40000000-0000-4000-8000-000000000001'::uuid, 'and that hand is their own'
);
select ok(
  not exists (select 1 from public.hands where user_id = '40000000-0000-4000-8000-000000000002'),
  'an opponent''s hand is not readable'
);
select ok(
  not has_table_privilege('authenticated', 'public.hands', 'INSERT')
  and not has_table_privilege('authenticated', 'public.programs', 'INSERT')
  and not has_table_privilege('authenticated', 'public.game_players', 'UPDATE'),
  'clients cannot write game state directly'
);

select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['a1','a2','a3'])$$,
  'P0001', 'wrong_card_count', 'a program needs exactly five cards'
);
select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array[]::text[])$$,
  'P0001', 'wrong_card_count', 'an empty program is a count error, not a duplicate error'
);
select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['a1','a1','a2','a3','a4'])$$,
  'P0001', 'duplicate_card', 'a card cannot be used twice'
);
select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['a1','a2','a3','a4','b1'])$$,
  'P0001', 'card_not_in_hand', 'a card from another hand is rejected'
);
select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000099', array['a1','a2','a3','a4','a5'])$$,
  'P0001', 'game_not_found', 'a missing game returns its reason'
);
select is(
  (select timer_started_at from public.games where id = '50000000-0000-4000-8000-000000000001'),
  null, 'the round timer has not started before the first lock in'
);
select lives_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['a5','a3','a1','a2','a4'])$$,
  'a valid program locks in'
);
select is(
  (select count(*) from public.programs where game_id = '50000000-0000-4000-8000-000000000001' and user_id = auth.uid()),
  1::bigint, 'locking in stores the program'
);
select isnt(
  (select timer_started_at from public.games where id = '50000000-0000-4000-8000-000000000001'),
  null, 'the first lock in starts the round timer'
);
select is(
  (select cards -> 0 ->> 'id' from public.programs where game_id = '50000000-0000-4000-8000-000000000001' and user_id = auth.uid()),
  'a5', 'the program keeps the chosen register order'
);
select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['a1','a2','a3','a4','a5'])$$,
  'P0001', 'already_locked_in', 'a second lock in is rejected'
);

set local request.jwt.claim.sub = '40000000-0000-4000-8000-000000000002';
select ok(
  not exists (select 1 from public.programs where user_id = '40000000-0000-4000-8000-000000000001'),
  'an opponent''s program stays hidden while programming'
);
select lives_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['b1','b2','b3','b4','b5'])$$,
  'the second player locks in'
);

set local request.jwt.claim.sub = '40000000-0000-4000-8000-000000000003';
select is(
  (select count(*) from public.game_players where game_id = '50000000-0000-4000-8000-000000000001'),
  0::bigint, 'an outsider sees no seats'
);
select is(
  (select count(*) from public.hands),
  0::bigint, 'an outsider sees no hands'
);
select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['a1','a2','a3','a4','a5'])$$,
  'P0001', 'not_in_game', 'an outsider cannot submit a program'
);

reset role;
select is(
  public.apply_round_result(
    '50000000-0000-4000-8000-000000000001', 1,
    (select updated_at from public.games where id = '50000000-0000-4000-8000-000000000001'),
    'end-of-round', '[]', '[]',
    '[{"user_id":"40000000-0000-4000-8000-000000000001","x":0,"z":0,"direction":1,"checkpoints_reached":0}]',
    '[]',
    null
  ),
  true, 'the server applies a round result once'
);
select is(
  public.apply_round_result(
    '50000000-0000-4000-8000-000000000001', 1,
    (select updated_at from public.games where id = '50000000-0000-4000-8000-000000000001'),
    'end-of-round', '[]', '[]', '[]', '[]', null
  ),
  false, 'the same round cannot be applied twice'
);
select is(
  (select row(z, lives)::text from public.game_players where game_id = '50000000-0000-4000-8000-000000000001' and user_id = '40000000-0000-4000-8000-000000000001'),
  '(0,3)', 'the applied result moved the player, and a result without lives is accepted'
);
set local role authenticated;
set local request.jwt.claim.sub = '40000000-0000-4000-8000-000000000002';
select is(
  (select count(*) from public.programs where game_id = '50000000-0000-4000-8000-000000000001'),
  2::bigint, 'programs are revealed to every player once the round resolves'
);
select is(
  (select count(*) from public.hands where game_id = '50000000-0000-4000-8000-000000000001'),
  1::bigint, 'hands stay private after the programs are revealed'
);
select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['b1','b2','b3','b4','b5'])$$,
  'P0001', 'not_programming_phase', 'no program can be submitted after the round resolves'
);

reset role;
insert into public.game_players (game_id, user_id, seat, robot_model, x, z, direction, lives) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 2, 'pixel', 0, 0, 1, 0);
insert into public.lobby_players (lobby_id, user_id) values
  ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003');
update public.games set phase = 'programming' where id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '40000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['a1','a2','a3','a4','a5'])$$,
  'P0001', 'no_lives_left', 'a player with no lives cannot program'
);
reset role;
update public.game_players set lives = 3 where game_id = '50000000-0000-4000-8000-000000000001' and user_id = '40000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claim.sub = '40000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['a1','a2','a3','a4','a5'])$$,
  'P0001', 'no_hand', 'a player without a hand this round cannot program'
);
reset role;
select ok(
  exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games'),
  'games are published to Realtime'
);
select ok(
  not has_function_privilege('authenticated', 'public.apply_round_result(uuid, integer, timestamptz, text, jsonb, jsonb, jsonb, jsonb, uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.begin_next_round(uuid, integer, jsonb)', 'EXECUTE'),
  'only the server can write a round result or start the next round'
);

update public.games set phase = 'programming' where id = '50000000-0000-4000-8000-000000000001';
select is(
  public.apply_round_result('50000000-0000-4000-8000-000000000001', 1, now() - interval '1 minute', 'end-of-round', '[]', '[]', '[]', '[]', null),
  false, 'a round result read before a later lock in is refused'
);
select is(
  (select phase from public.games where id = '50000000-0000-4000-8000-000000000001'),
  'programming', 'a refused result changes nothing'
);
select is(
  public.apply_round_result(
    '50000000-0000-4000-8000-000000000001', 1,
    (select updated_at from public.games where id = '50000000-0000-4000-8000-000000000001'),
    'finished', '[]', '[]', '[]', '[]', '40000000-0000-4000-8000-000000000001'
  ),
  true, 'the same call with the current timestamp is accepted'
);
select is(
  (select winner_id from public.games where id = '50000000-0000-4000-8000-000000000001'),
  '40000000-0000-4000-8000-000000000001'::uuid, 'the winner is recorded'
);
select is(
  (select status from public.lobbies where game = '50000000-0000-4000-8000-000000000001'),
  'finished', 'finishing the game finishes the lobby'
);

-- begin_next_round: refused in the wrong phase, then applied once.
select is(
  public.begin_next_round('50000000-0000-4000-8000-000000000001', 1, '[]'),
  false, 'a finished game cannot start another round'
);
update public.games set phase = 'end-of-round' where id = '50000000-0000-4000-8000-000000000001';
select is(
  public.begin_next_round('50000000-0000-4000-8000-000000000001', 2, '[]'),
  false, 'the wrong round number is refused'
);
select is(
  public.begin_next_round(
    '50000000-0000-4000-8000-000000000001', 1,
    '[{"user_id":"40000000-0000-4000-8000-000000000001","cards":[{"id":"n1","name":"Move 1","type":"move","value":1,"priority":500}]}]'
  ),
  true, 'the next round starts once'
);
select is(
  (select row(round, phase, timer_started_at)::text from public.games where id = '50000000-0000-4000-8000-000000000001'),
  '(2,programming,)', 'the round advances, the phase resets and the timer clears'
);
select is(
  (select count(*) from public.programs where game_id = '50000000-0000-4000-8000-000000000001'),
  0::bigint, 'old programs are cleared'
);
select is(
  (select round from public.hands where game_id = '50000000-0000-4000-8000-000000000001' and user_id = '40000000-0000-4000-8000-000000000001'),
  2, 'the new hand belongs to round 2'
);
select is(
  public.begin_next_round('50000000-0000-4000-8000-000000000001', 1, '[]'),
  false, 'the same round cannot be started twice'
);

select ok(
  has_table_privilege('service_role', 'public.games', 'SELECT')
  and has_table_privilege('service_role', 'public.games', 'UPDATE')
  and has_table_privilege('service_role', 'public.game_players', 'SELECT')
  and has_table_privilege('service_role', 'public.game_players', 'INSERT')
  and has_table_privilege('service_role', 'public.hands', 'SELECT')
  and has_table_privilege('service_role', 'public.hands', 'INSERT')
  and has_table_privilege('service_role', 'public.programs', 'SELECT')
  and has_table_privilege('service_role', 'public.lobbies', 'SELECT')
  and has_table_privilege('service_role', 'public.lobby_players', 'SELECT')
  and has_table_privilege('service_role', 'public.users', 'SELECT')
  and has_function_privilege('service_role', 'public.apply_round_result(uuid, integer, timestamptz, text, jsonb, jsonb, jsonb, jsonb, uuid)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.begin_next_round(uuid, integer, jsonb)', 'EXECUTE'),
  'the server role can read and write everything the game needs'
);

select * from finish();
rollback;
