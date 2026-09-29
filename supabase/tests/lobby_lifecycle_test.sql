begin;
create extension if not exists pgtap with schema extensions;
select plan(49);

-- All fixtures and RPC writes are rolled back at the end of this file.
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'lobby-owner@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'lobby-player@example.test'),
  ('10000000-0000-4000-8000-000000000003', 'lobby-outsider@example.test'),
  ('10000000-0000-4000-8000-000000000004', 'lobby-free-agent@example.test'),
  ('10000000-0000-4000-8000-000000000005', 'lobby-founder@example.test');
insert into public.games (id) values
  ('20000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002');
insert into public.lobbies (id, created_by, game, max_players, status) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 2, 'open'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 4, 'finished');
insert into public.lobby_players (lobby_id, user_id) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001');

set local role anon;
select throws_ok(
  $$select public.create_lobby_with_game()$$,
  'P0001', 'create_lobby_with_game: not authenticated', 'anonymous users cannot create lobbies'
);
select throws_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'not_authenticated', 'joining requires authentication'
);
select throws_ok(
  $$select public.start_lobby('30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'not_creator', 'anonymous users cannot start a lobby'
);
select throws_ok(
  $$insert into public.lobby_players (lobby_id, user_id) values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003')$$,
  '42501', 'permission denied for table lobby_players', 'anonymous users cannot insert membership directly'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000005';
select lives_ok(
  $$select set_config('test.created_lobby', public.create_lobby_with_game()::text, true)$$,
  'creation still works after direct insert privileges are revoked'
);
select is(
  (select status from public.lobbies where id = current_setting('test.created_lobby')::uuid),
  'open', 'new lobbies default to open'
);
select is(
  (select count(*) from public.lobby_players where lobby_id = current_setting('test.created_lobby')::uuid and user_id = auth.uid()),
  1::bigint, 'creation adds the creator exactly once'
);
select ok(
  exists(select 1 from public.lobbies l join public.games g on g.id = l.game where l.id = current_setting('test.created_lobby')::uuid),
  'creation links the lobby to a game'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select is(
  (select count(*) from public.games where id = (select game from public.lobbies where id = current_setting('test.created_lobby')::uuid)),
  0::bigint, 'a player outside the lobby cannot read its game'
);
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000099')$$,
  'P0001', 'lobby_not_found', 'joining a missing lobby returns its reason'
);
select throws_ok(
  $$select public.start_lobby('30000000-0000-4000-8000-000000000099')$$,
  'P0001', 'lobby_not_found', 'starting a missing lobby returns its reason'
);
select throws_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'already_member', 'a duplicate join is rejected before the lobby is full'
);
select is(
  (select count(*) from public.lobby_players where lobby_id = '30000000-0000-4000-8000-000000000001'),
  1::bigint, 'a rejected duplicate does not change membership'
);
select throws_ok(
  $$select public.start_lobby('30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'not_enough_players', 'starting requires at least two players'
);
select throws_ok(
  $$update public.lobbies set status = 'started' where id = '30000000-0000-4000-8000-000000000001'$$,
  '42501', 'permission denied for table lobbies', 'even the creator cannot bypass start checks by updating the table'
);
select throws_ok(
  $$insert into public.lobbies (created_by, game) values (auth.uid(), '20000000-0000-4000-8000-000000000001')$$,
  '42501', 'permission denied for table lobbies', 'creation must use the RPC'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select throws_ok(
  $$select public.start_lobby('30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'not_creator', 'another player cannot start the lobby'
);
select lives_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000001')$$,
  'a new player can join an open lobby with space'
);
select is(
  (select count(*) from public.lobby_players where lobby_id = '30000000-0000-4000-8000-000000000001' and user_id = auth.uid()),
  1::bigint, 'joining inserts the authenticated player'
);
select is(
  (select count(*) from public.lobby_players where lobby_id = '30000000-0000-4000-8000-000000000001'),
  2::bigint, 'the last available place is filled'
);
select throws_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'already_member', 'a duplicate join also reports membership when the lobby is full'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'lobby_full', 'a new player cannot exceed capacity'
);
select throws_ok(
  $$insert into public.lobby_players (lobby_id, user_id) values ('30000000-0000-4000-8000-000000000001', auth.uid())$$,
  '42501', 'permission denied for table lobby_players', 'direct insertion cannot bypass capacity'
);
select throws_ok(
  $$update public.lobby_players set lobby_id = '30000000-0000-4000-8000-000000000002' where user_id = auth.uid()$$,
  '42501', 'permission denied for table lobby_players', 'direct updates cannot move membership between lobbies'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select is(
  public.start_lobby('30000000-0000-4000-8000-000000000001'),
  '20000000-0000-4000-8000-000000000001'::uuid, 'the creator can start and receives the linked game ID'
);
select is(
  (select status from public.lobbies where id = '30000000-0000-4000-8000-000000000001'),
  'started', 'starting persists the status'
);
select throws_ok(
  $$select public.start_lobby('30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'already_started', 'a started lobby cannot be started again'
);
select throws_ok(
  $$select public.start_lobby('30000000-0000-4000-8000-000000000002')$$,
  'P0001', 'already_started', 'a finished lobby cannot be restarted'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'lobby_not_open', 'a started lobby cannot be joined'
);
select throws_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000002')$$,
  'P0001', 'lobby_not_open', 'a finished lobby cannot be joined'
);

-- One lobby at a time, and leaving it again.
reset role;
insert into public.games (id) values
  ('20000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000004');
insert into public.lobbies (id, created_by, game, max_players, status) values
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 4, 'open'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 4, 'open');
insert into public.lobby_players (lobby_id, user_id) values
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000004';
select lives_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000003')$$,
  'a free player can join an open lobby'
);
select throws_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000004')$$,
  'P0001', 'already_in_a_lobby', 'a player cannot be in two lobbies at once'
);
select throws_ok(
  $$select public.leave_lobby('30000000-0000-4000-8000-000000000004')$$,
  'P0001', 'not_in_lobby', 'leaving a lobby you are not in is rejected'
);
select lives_ok(
  $$select public.leave_lobby('30000000-0000-4000-8000-000000000003')$$,
  'a player can leave an open lobby'
);
select is(
  (select count(*) from public.lobby_players where lobby_id = '30000000-0000-4000-8000-000000000003'),
  1::bigint, 'leaving removes only that player'
);
select lives_ok(
  $$select public.join_lobby('30000000-0000-4000-8000-000000000004')$$,
  'after leaving, the player can join another lobby'
);
select throws_ok(
  $$select public.create_lobby_with_game()$$,
  'P0001', 'already_in_a_lobby', 'a player in a lobby cannot create another one'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.leave_lobby('30000000-0000-4000-8000-000000000003')$$,
  'the host can close their own lobby'
);
select is(
  (select count(*) from public.lobbies where id = '30000000-0000-4000-8000-000000000003'),
  0::bigint, 'closing the lobby as host removes it for everyone'
);
select is(
  (select count(*) from public.lobby_players where lobby_id = '30000000-0000-4000-8000-000000000003'),
  0::bigint, 'closing the lobby removes its players'
);
select ok(
  not has_table_privilege('authenticated', 'public.lobby_players', 'DELETE'),
  'a client cannot leave by deleting the row directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.lobbies', 'DELETE'),
  'a client cannot remove a lobby by deleting the row directly'
);
select throws_ok(
  $$select public.leave_lobby('30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'lobby_not_open', 'a started lobby cannot be left'
);
select ok(
  has_column_privilege('authenticated', 'public.users', 'display_name', 'SELECT'),
  'a player can read other players display names'
);
select ok(
  not exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'email'
  ),
  'public.users holds no private email column'
);

reset role;
select ok(
  (select relreplident from pg_class where oid = 'public.lobbies'::regclass) = 'f',
  'lobbies use replica identity full so Realtime carries deletes'
);
select ok(
  (select relreplident from pg_class where oid = 'public.lobby_players'::regclass) = 'f',
  'lobby membership uses replica identity full so Realtime carries deletes'
);
select ok(
  exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lobbies'),
  'lobbies are published to Realtime'
);
select ok(
  exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lobby_players'),
  'lobby membership is published to Realtime'
);

select * from finish();
rollback;
