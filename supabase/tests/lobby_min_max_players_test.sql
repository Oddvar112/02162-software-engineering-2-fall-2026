begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- Fixture users
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'host@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'player2@example.test'),
  ('a0000000-0000-4000-8000-000000000003', 'player3@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'player4@example.test'),
  ('a0000000-0000-4000-8000-000000000005', 'outsider@example.test');

set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

-- 1-4: Lobby creation defaults to min 2 and max 8
select lives_ok(
  $$select set_config('test.lobby_id', public.create_lobby_with_game()::text, true)$$,
  'creator creates lobby with default limits'
);

select is(
  (select min_players from public.lobbies where id = current_setting('test.lobby_id')::uuid),
  2, 'new lobby defaults to min_players = 2'
);

select is(
  (select max_players from public.lobbies where id = current_setting('test.lobby_id')::uuid),
  8, 'new lobby defaults to max_players = 8'
);

-- Pick robot for host
select lives_ok(
  $$select public.choose_robot(current_setting('test.lobby_id')::uuid, 'bolt')$$,
  'host picks robot'
);

-- 5-7: Host updates limits to min 3, max 3
select lives_ok(
  $$select public.update_lobby_settings(current_setting('test.lobby_id')::uuid, 3, 3)$$,
  'host can update settings to min 3, max 3'
);
select is(
  (select min_players from public.lobbies where id = current_setting('test.lobby_id')::uuid),
  3, 'lobby reflects updated min_players'
);
select is(
  (select max_players from public.lobbies where id = current_setting('test.lobby_id')::uuid),
  3, 'lobby reflects updated max_players'
);

-- 8-9: Player 2 joins and picks robot
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
select lives_ok(
  $$select public.join_lobby(current_setting('test.lobby_id')::uuid)$$,
  'player 2 joins'
);
select lives_ok(
  $$select public.choose_robot(current_setting('test.lobby_id')::uuid, 'gizmo')$$,
  'player 2 picks robot'
);

-- 10: Host tries to start with 2 players when min_players is 3 -> rejected
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.start_lobby(current_setting('test.lobby_id')::uuid)$$,
  'P0001', 'not_enough_players', 'cannot start when player count is below min_players'
);

-- 11-13: Validation on update_lobby_settings
-- Non-host trying to update settings -> rejected
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
select throws_ok(
  $$select public.update_lobby_settings(current_setting('test.lobby_id')::uuid, 2, 4)$$,
  'P0001', 'not_creator', 'only host can update lobby settings'
);

-- Host trying to set max_players below current player count (2 players present) -> rejected
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.update_lobby_settings(current_setting('test.lobby_id')::uuid, 2, 1)$$,
  'P0001', 'invalid_player_limits', 'max cannot be less than 2'
);

-- Host trying to set min > max -> rejected
select throws_ok(
  $$select public.update_lobby_settings(current_setting('test.lobby_id')::uuid, 4, 3)$$,
  'P0001', 'invalid_player_limits', 'min cannot exceed max'
);

-- 14-15: Player 3 joins (reaching max capacity 3)
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000003';
select lives_ok(
  $$select public.join_lobby(current_setting('test.lobby_id')::uuid)$$,
  'player 3 joins up to max_players capacity'
);
select lives_ok(
  $$select public.choose_robot(current_setting('test.lobby_id')::uuid, 'brutus')$$,
  'player 3 picks robot'
);

-- 16: Player 4 tries to join -> rejected (lobby_full)
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000004';
select throws_ok(
  $$select public.join_lobby(current_setting('test.lobby_id')::uuid)$$,
  'P0001', 'lobby_full', 'cannot join once max_players is reached'
);

-- 17: Host can start now since player count (3) >= min_players (3)
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.start_lobby(current_setting('test.lobby_id')::uuid)$$,
  'game starts once minimum player count is met'
);

-- 18: Cannot update settings after lobby is started
select throws_ok(
  $$select public.update_lobby_settings(current_setting('test.lobby_id')::uuid, 2, 4)$$,
  'P0001', 'lobby_not_open', 'cannot update settings once game is started'
);

select * from finish();
rollback;
