begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Fixture users
insert into auth.users (id, email) values
  ('d0000000-0000-4000-8000-000000000001', 'demohost@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'demoguest@example.test');

-- 1. Classic game and lobby fixture
insert into public.games (id, mode, round, phase) values
  ('e0000000-0000-4000-8000-000000000001', 'classic', 1, 'programming');

insert into public.lobbies (id, created_by, game, max_players, min_players, status) values
  ('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 4, 2, 'open');

insert into public.lobby_players (lobby_id, user_id, robot_model) values
  ('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'bolt');

insert into public.game_players (game_id, user_id, seat, robot_model, x, z, direction, lives) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 0, 'bolt', 0, 0, 0, 3);

insert into public.hands (game_id, user_id, round, cards) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1,
   '[{"id":"c1","name":"Move 1","priority":100},{"id":"c2","name":"Move 2","priority":200}]'::jsonb);

-- 2. Demo game and lobby fixture
insert into public.games (id, mode, round, phase) values
  ('e0000000-0000-4000-8000-000000000002', 'demo', 1, 'programming');

insert into public.lobbies (id, created_by, game, max_players, min_players, status) values
  ('f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 4, 2, 'open');

insert into public.lobby_players (lobby_id, user_id, robot_model) values
  ('f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'bolt');

insert into public.game_players (game_id, user_id, seat, robot_model, x, z, direction, lives) values
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 0, 'bolt', 0, 0, 0, 3);

insert into public.hands (game_id, user_id, round, cards) values
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 1,
   '[{"id":"c1","name":"Move 1","priority":100},{"id":"c2","name":"Move 2","priority":200}]'::jsonb);

set local role authenticated;
set local request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';

-- 1: Classic mode requires min_players (2)
select throws_ok(
  $$select public.start_lobby('f0000000-0000-4000-8000-000000000001')$$,
  'P0001', 'not_enough_players', 'classic game cannot start with 1 player'
);

-- 2: Demo mode allows starting with 1 player
select lives_ok(
  $$select public.start_lobby('f0000000-0000-4000-8000-000000000002')$$,
  'demo game can start with 1 player'
);

-- 3: Lobby status transitions to started
select is(
  (select status from public.lobbies where id = 'f0000000-0000-4000-8000-000000000002'),
  'started', 'lobby status is updated to started in demo mode'
);

-- 4: Classic mode rejects programs with fewer than 5 cards
select throws_ok(
  $$select public.submit_program('e0000000-0000-4000-8000-000000000001', array['c1'])$$,
  'P0001', 'wrong_card_count', 'classic mode rejects programs with fewer than 5 cards'
);

-- 5: Empty program rejected in demo mode
select throws_ok(
  $$select public.submit_program('e0000000-0000-4000-8000-000000000002', array[]::text[])$$,
  'P0001', 'wrong_card_count', 'empty program is rejected in demo mode'
);

-- 6: Duplicate card rejected in demo mode
select throws_ok(
  $$select public.submit_program('e0000000-0000-4000-8000-000000000002', array['c1', 'c1'])$$,
  'P0001', 'duplicate_card', 'duplicate cards are rejected in demo mode'
);

-- 7: Submitting single card succeeds in demo mode
select lives_ok(
  $$select public.submit_program('e0000000-0000-4000-8000-000000000002', array['c1'])$$,
  'single card program succeeds in demo mode'
);

-- 8: Program is stored in public.programs table
select is(
  (select count(*) from public.programs where game_id = 'e0000000-0000-4000-8000-000000000002' and user_id = 'd0000000-0000-4000-8000-000000000001'),
  1::bigint, 'program is stored in public.programs table'
);

-- 9: Cannot resubmit once locked in
select throws_ok(
  $$select public.submit_program('e0000000-0000-4000-8000-000000000002', array['c2'])$$,
  'P0001', 'already_locked_in', 'cannot resubmit once locked in'
);

rollback;
