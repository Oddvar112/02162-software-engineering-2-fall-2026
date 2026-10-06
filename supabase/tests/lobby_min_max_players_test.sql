begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Fixture users
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'host@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'player2@example.test'),
  ('a0000000-0000-4000-8000-000000000003', 'player3@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'player4@example.test'),
  ('a0000000-0000-4000-8000-000000000005', 'outsider@example.test');

-- 1-4: Invalid lobby creations are rejected
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.create_lobby_with_game(5, 3)$$,
  'P0001', 'invalid_player_limits', 'min cannot be greater than max on create'
);

select throws_ok(
  $$select public.create_lobby_with_game(1, 4)$$,
  'P0001', 'invalid_player_limits', 'min cannot be less than 2 on create'
);

select throws_ok(
  $$select public.create_lobby_with_game(2, 9)$$,
  'P0001', 'invalid_player_limits', 'max cannot exceed 8 on create'
);

select throws_ok(
  $$select public.create_lobby_with_game(null, 4)$$,
  'P0001', 'invalid_player_limits', 'null limits are rejected'
);

-- 5-8: Valid lobby creation with custom limits (3 min, 3 max)
select lives_ok(
  $$select set_config('test.lobby_id', public.create_lobby_with_game(3, 3)::text, true)$$,
  'creator can create lobby with custom valid limits'
);

select is(
  (select min_players from public.lobbies where id = current_setting('test.lobby_id')::uuid),
  3, 'lobby stores configured min_players'
);

select is(
  (select max_players from public.lobbies where id = current_setting('test.lobby_id')::uuid),
  3, 'lobby stores configured max_players'
);

-- Pick robot for host
select lives_ok(
  $$select public.choose_robot(current_setting('test.lobby_id')::uuid, 'bolt')$$,
  'host picks robot'
);

-- 9-10: Player 2 joins
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
select lives_ok(
  $$select public.join_lobby(current_setting('test.lobby_id')::uuid)$$,
  'player 2 joins'
);
select lives_ok(
  $$select public.choose_robot(current_setting('test.lobby_id')::uuid, 'gizmo')$$,
  'player 2 picks robot'
);

-- 11: Host tries to start with 2 players when min_players is 3 -> rejected
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.start_lobby(current_setting('test.lobby_id')::uuid)$$,
  'P0001', 'not_enough_players', 'cannot start when player count is below min_players'
);

-- 12-14: Host updates settings
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

-- Host updates limits to min 2, max 3
select lives_ok(
  $$select public.update_lobby_settings(current_setting('test.lobby_id')::uuid, 2, 3)$$,
  'host successfully updates limits to min 2, max 3'
);
select is(
  (select min_players from public.lobbies where id = current_setting('test.lobby_id')::uuid),
  2, 'lobby reflects updated min_players'
);
select is(
  (select max_players from public.lobbies where id = current_setting('test.lobby_id')::uuid),
  3, 'lobby reflects updated max_players'
);

-- 17-18: Player 3 joins (reaching max capacity 3)
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000003';
select lives_ok(
  $$select public.join_lobby(current_setting('test.lobby_id')::uuid)$$,
  'player 3 joins up to max_players capacity'
);
select lives_ok(
  $$select public.choose_robot(current_setting('test.lobby_id')::uuid, 'brutus')$$,
  'player 3 picks robot'
);

-- 19: Player 4 tries to join -> rejected (lobby_full)
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000004';
select throws_ok(
  $$select public.join_lobby(current_setting('test.lobby_id')::uuid)$$,
  'P0001', 'lobby_full', 'cannot join once max_players is reached'
);

-- 20: Host tries to reduce max_players to 2 while 3 players are in lobby -> rejected
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.update_lobby_settings(current_setting('test.lobby_id')::uuid, 2, 2)$$,
  'P0001', 'max_below_current_players', 'cannot set max_players lower than current member count'
);

-- 21: Host can start now since player count (3) >= min_players (2)
select lives_ok(
  $$select public.start_lobby(current_setting('test.lobby_id')::uuid)$$,
  'game starts once minimum player count is met'
);

-- 22: Cannot update settings after lobby is started
select throws_ok(
  $$select public.update_lobby_settings(current_setting('test.lobby_id')::uuid, 2, 4)$$,
  'P0001', 'lobby_not_open', 'cannot update settings once game is started'
);

select * from finish();
rollback;
