create or replace function public.join_lobby(p_lobby_id uuid)
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

  perform 1 from users where id = auth.uid() for update;

  select * into v_lobby from lobbies where id = p_lobby_id for update;

  if not found then
    raise exception 'lobby_not_found';
  end if;

  if v_lobby.status <> 'open' then
    raise exception 'lobby_not_open';
  end if;

  if exists (
    select 1 from lobby_players
    where lobby_id = p_lobby_id and user_id = auth.uid()
  ) then
    raise exception 'already_member';
  end if;

  if exists (
    select 1
    from lobby_players p
    join lobbies l on l.id = p.lobby_id
    where p.user_id = auth.uid() and l.status in ('open', 'started')
  ) then
    raise exception 'already_in_a_lobby';
  end if;

  if (select count(*) from lobby_players where lobby_id = p_lobby_id)
     >= v_lobby.max_players then
    raise exception 'lobby_full';
  end if;

  insert into lobby_players (lobby_id, user_id)
  values (p_lobby_id, auth.uid());
end;
$$;

create function public.leave_lobby(p_lobby_id uuid)
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

  if v_lobby.created_by = auth.uid() then
    delete from games where id = v_lobby.game;
  else
    delete from lobby_players
    where lobby_id = p_lobby_id and user_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.leave_lobby(uuid) from public;
grant execute on function public.leave_lobby(uuid) to authenticated;

drop policy if exists "lobbies_delete" on public.lobbies;
drop policy if exists "lobby_players_delete" on public.lobby_players;

revoke delete on public.lobbies from anon, authenticated;
revoke delete on public.lobby_players from anon, authenticated;

alter table public.lobbies replica identity full;
alter table public.lobby_players replica identity full;

create or replace function public.create_lobby_with_game()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_game_id  uuid;
  v_lobby_id uuid;
begin
  if v_user_id is null then
    raise exception 'create_lobby_with_game: not authenticated';
  end if;

  perform 1 from users where id = auth.uid() for update;

  if exists (
    select 1
    from lobby_players p
    join lobbies l on l.id = p.lobby_id
    where p.user_id = v_user_id and l.status in ('open', 'started')
  ) then
    raise exception 'already_in_a_lobby';
  end if;

  insert into games default values
  returning id into v_game_id;

  insert into lobbies (created_by, max_players, game)
  values (v_user_id, 8, v_game_id)
  returning id into v_lobby_id;

  insert into lobby_players (lobby_id, user_id)
  values (v_lobby_id, v_user_id);

  return v_lobby_id;
end;
$$;
