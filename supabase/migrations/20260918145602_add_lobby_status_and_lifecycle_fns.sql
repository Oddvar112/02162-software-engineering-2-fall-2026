alter table public.lobbies
  add column status text not null default 'open';

alter table public.lobbies
  add constraint lobbies_status_check
  check (status in ('open', 'started', 'finished'));

drop policy if exists "lobbies_insert" on public.lobbies;
drop policy if exists "lobby_players_insert" on public.lobby_players;

revoke insert, update on public.lobbies from anon, authenticated;
revoke insert, update on public.lobby_players from anon, authenticated;

alter function public.create_lobby_with_game() security definer;

create function public.join_lobby(p_lobby_id uuid)
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

  if v_lobby.status <> 'open' then
    raise exception 'lobby_not_open';
  end if;

  if (select count(*) from lobby_players where lobby_id = p_lobby_id)
     >= v_lobby.max_players then
    raise exception 'lobby_full';
  end if;

  insert into lobby_players (lobby_id, user_id)
  values (p_lobby_id, auth.uid())
  on conflict do nothing;
end;
$$;

create function public.start_lobby(p_lobby_id uuid)
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

  update lobbies set status = 'started' where id = p_lobby_id;

  return v_lobby.game;
end;
$$;

alter publication supabase_realtime add table public.lobbies;
alter publication supabase_realtime add table public.lobby_players;
