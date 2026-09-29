create function public.leave_lobby(p_lobby_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  delete from lobby_players
  where lobby_id = p_lobby_id and user_id = auth.uid();
end;
$$;
