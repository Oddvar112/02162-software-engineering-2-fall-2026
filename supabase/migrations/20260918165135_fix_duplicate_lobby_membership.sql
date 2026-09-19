-- Keep the original lifecycle migration intact for databases that applied it.
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

  if (select count(*) from lobby_players where lobby_id = p_lobby_id)
     >= v_lobby.max_players then
    raise exception 'lobby_full';
  end if;

  insert into lobby_players (lobby_id, user_id)
  values (p_lobby_id, auth.uid());
end;
$$;
