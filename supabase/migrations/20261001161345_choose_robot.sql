alter table public.lobby_players
  add column robot_model text,
  add constraint lobby_players_robot_unique unique (lobby_id, robot_model);

create function public.choose_robot(p_lobby_id uuid, p_model text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby lobbies;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_lobby from lobbies where id = p_lobby_id for update;

  if not found then
    raise exception 'lobby_not_found';
  end if;

  if not exists (
    select 1 from lobby_players
    where lobby_id = p_lobby_id and user_id = auth.uid()
  ) then
    raise exception 'not_in_lobby';
  end if;

  if v_lobby.status <> 'open' then
    raise exception 'lobby_not_open';
  end if;

  if p_model is null or p_model not in (
    'bolt', 'gizmo', 'brutus', 'noodle', 'disco',
    'chomp', 'pixel', 'snooze', 'captain', 'glitch'
  ) then
    raise exception 'unknown_robot';
  end if;

  if exists (
    select 1 from lobby_players
    where lobby_id = p_lobby_id
      and robot_model = p_model
      and user_id <> auth.uid()
  ) then
    raise exception 'robot_taken';
  end if;

  update lobby_players
  set robot_model = p_model
  where lobby_id = p_lobby_id and user_id = auth.uid();
end;
$$;

revoke all on function public.choose_robot(uuid, text) from public, anon;
grant execute on function public.choose_robot(uuid, text) to authenticated;

create or replace function public.start_lobby(p_lobby_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lobby lobbies;
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

  if (select count(*) from lobby_players where lobby_id = p_lobby_id) < 2 then
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
