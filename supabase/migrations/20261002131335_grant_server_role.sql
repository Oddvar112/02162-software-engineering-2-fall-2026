grant select on public.lobbies to service_role;
grant select on public.lobby_players to service_role;
grant select on public.users to service_role;
grant select, update on public.games to service_role;
grant select, insert on public.game_players to service_role;
grant select, insert on public.hands to service_role;
grant select on public.programs to service_role;

grant execute on function public.apply_round_result(uuid, integer, timestamptz, text, jsonb, jsonb, jsonb, jsonb,jsonb, uuid) to service_role;
grant execute on function public.begin_next_round(uuid, integer, jsonb, jsonb) to service_role;
