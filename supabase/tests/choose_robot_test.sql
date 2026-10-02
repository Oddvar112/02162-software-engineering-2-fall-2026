begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('70000000-0000-4000-8000-000000000001', 'robot-host@example.test'),
  ('70000000-0000-4000-8000-000000000002', 'robot-guest@example.test'),
  ('70000000-0000-4000-8000-000000000003', 'robot-outsider@example.test');
insert into public.games (id) values
  ('80000000-0000-4000-8000-000000000001');
insert into public.lobbies (id, created_by, game, max_players, status) values
  ('90000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 4, 'open');
insert into public.lobby_players (lobby_id, user_id) values
  ('90000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001'),
  ('90000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002');

select ok(
  not has_function_privilege('anon', 'public.choose_robot(uuid, text)', 'EXECUTE'),
  'anonymous users cannot choose a robot'
);

set local role authenticated;
set local request.jwt.claim.sub = '70000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.choose_robot('90000000-0000-4000-8000-000000000099', 'bolt')$$,
  'P0001', 'lobby_not_found', 'choosing in a missing lobby returns its reason'
);
select throws_ok(
  $$select public.choose_robot('90000000-0000-4000-8000-000000000001', 'toaster')$$,
  'P0001', 'unknown_robot', 'a model outside the roster is rejected'
);
select throws_ok(
  $$select public.choose_robot('90000000-0000-4000-8000-000000000001', null)$$,
  'P0001', 'unknown_robot', 'a missing model is rejected'
);
select lives_ok(
  $$select public.choose_robot('90000000-0000-4000-8000-000000000001', 'bolt')$$,
  'a member can choose a robot from the roster'
);
select lives_ok(
  $$select public.choose_robot('90000000-0000-4000-8000-000000000001', 'pixel')$$,
  'a member can change their choice'
);
select is(
  (select robot_model from public.lobby_players where lobby_id = '90000000-0000-4000-8000-000000000001' and user_id = auth.uid()),
  'pixel', 'the latest choice is stored'
);
select throws_ok(
  $$update public.lobby_players set robot_model = 'bolt' where user_id = auth.uid()$$,
  '42501', 'permission denied for table lobby_players', 'the choice cannot be written directly'
);
select throws_ok(
  $$select public.start_lobby('90000000-0000-4000-8000-000000000001')$$,
  'P0001', 'robot_not_chosen', 'the lobby cannot start while a player has no robot'
);

set local request.jwt.claim.sub = '70000000-0000-4000-8000-000000000002';
select throws_ok(
  $$select public.choose_robot('90000000-0000-4000-8000-000000000001', 'pixel')$$,
  'P0001', 'robot_taken', 'two players cannot pick the same robot'
);
select is(
  (select robot_model from public.lobby_players where lobby_id = '90000000-0000-4000-8000-000000000001' and user_id = auth.uid()),
  null, 'a rejected choice stores nothing'
);
select lives_ok(
  $$select public.choose_robot('90000000-0000-4000-8000-000000000001', 'bolt')$$,
  'a robot another player gave up is free again'
);

set local request.jwt.claim.sub = '70000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select public.choose_robot('90000000-0000-4000-8000-000000000001', 'gizmo')$$,
  'P0001', 'not_in_lobby', 'an outsider cannot choose a robot'
);
select is(
  (select count(*) from public.lobby_players where lobby_id = '90000000-0000-4000-8000-000000000001' and robot_model is not null),
  2::bigint, 'everyone can see which robots are taken'
);

set local request.jwt.claim.sub = '70000000-0000-4000-8000-000000000001';
select lives_ok(
  $$select public.choose_robot('90000000-0000-4000-8000-000000000001', 'pixel')$$,
  'choosing the robot you already have is accepted'
);
select is(
  public.start_lobby('90000000-0000-4000-8000-000000000001'),
  '80000000-0000-4000-8000-000000000001'::uuid, 'the lobby starts once every player has a robot'
);
select throws_ok(
  $$select public.choose_robot('90000000-0000-4000-8000-000000000001', 'gizmo')$$,
  'P0001', 'lobby_not_open', 'a robot cannot be changed after the game has started'
);
select is(
  (select robot_model from public.lobby_players where lobby_id = '90000000-0000-4000-8000-000000000001' and user_id = auth.uid()),
  'pixel', 'a refused change leaves the choice as it was'
);

reset role;
select throws_ok(
  $$update public.lobby_players set robot_model = 'pixel' where lobby_id = '90000000-0000-4000-8000-000000000001'$$,
  '23505', null, 'the table itself refuses the same robot twice in one lobby'
);
select ok(
  (select count(*) from public.lobby_players where lobby_id = '90000000-0000-4000-8000-000000000001' and robot_model is null) = 0,
  'a refused write leaves both choices in place'
);

select * from finish();
rollback;
