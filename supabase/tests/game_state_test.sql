begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email) values
  ('40000000-0000-4000-8000-000000000001', 'game-alice@example.test'),
  ('40000000-0000-4000-8000-000000000002', 'game-bob@example.test'),
  ('40000000-0000-4000-8000-000000000003', 'game-outsider@example.test');
insert into public.games (id, board) values
  ('50000000-0000-4000-8000-000000000001', '{"id":"t","width":2,"height":2,"tiles":[[{"kind":"floor"},{"kind":"floor"}],[{"kind":"floor"},{"kind":"floor"}]],"walls":[],"startpositions":[{"x":0,"y":1},{"x":1,"y":1}]}');
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
update public.games set phase = 'end-of-round' where id = '50000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = '40000000-0000-4000-8000-000000000002';
select is(
  (select count(*) from public.programs where game_id = '50000000-0000-4000-8000-000000000001'),
  2::bigint, 'programs are revealed to every player once the round resolves'
);
select throws_ok(
  $$select public.submit_program('50000000-0000-4000-8000-000000000001', array['b1','b2','b3','b4','b5'])$$,
  'P0001', 'not_programming_phase', 'no program can be submitted after the round resolves'
);

reset role;
select ok(
  exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games'),
  'games are published to Realtime'
);
select ok(
  (select relreplident from pg_class where oid = 'public.game_players'::regclass) = 'f',
  'game players use replica identity full so filtered events carry the game id'
);

select * from finish();
rollback;
