alter table public.games
  add column phase text not null default 'programming',
  add column round integer not null default 1,
  add column board jsonb,
  add column execution_log jsonb not null default '[]'::jsonb,
  add column execution_frames jsonb not null default '[]'::jsonb,
  add column timer_started_at timestamptz,
  add column updated_at timestamptz not null default now();

alter table public.games
  add constraint games_phase_check
  check (phase in ('programming', 'end-of-round', 'finished'));

create table public.game_players (
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  seat integer not null,
  robot_model text not null,
  x integer not null,
  z integer not null,
  direction integer not null,
  damage integer not null default 0,
  lives integer not null default 3,
  checkpoints_reached integer not null default 0,
  locked_in boolean not null default false,
  ready_for_next boolean not null default false,
  primary key (game_id, user_id),
  unique (game_id, seat)
);

create table public.hands (
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  round integer not null,
  cards jsonb not null,
  primary key (game_id, user_id)
);

create table public.programs (
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  round integer not null,
  cards jsonb not null,
  primary key (game_id, user_id)
);

create index game_players_user_id_idx on public.game_players (user_id);
create index lobbies_game_idx on public.lobbies (game);

alter table public.game_players enable row level security;
alter table public.hands enable row level security;
alter table public.programs enable row level security;

revoke all on public.game_players from anon, authenticated;
revoke all on public.hands from anon, authenticated;
revoke all on public.programs from anon, authenticated;

grant select on public.game_players to authenticated;
grant select on public.hands to authenticated;
grant select on public.programs to authenticated;

create policy "game_players_select_member" on public.game_players
  for select to authenticated
  using (
    exists (
      select 1
      from public.lobbies l
      join public.lobby_players p on p.lobby_id = l.id
      where l.game = game_players.game_id and p.user_id = auth.uid()
    )
  );

create policy "hands_select_own" on public.hands
  for select to authenticated
  using (user_id = auth.uid());

create policy "programs_select_own_or_revealed" on public.programs
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.games g
      where g.id = programs.game_id and g.phase <> 'programming'
    )
  );

create function public.submit_program(p_game_id uuid, p_card_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games;
  v_player game_players;
  v_hand hands;
  v_program jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_game from games where id = p_game_id for update;

  if not found then
    raise exception 'game_not_found';
  end if;

  if v_game.phase <> 'programming' then
    raise exception 'not_programming_phase';
  end if;

  select * into v_player
  from game_players
  where game_id = p_game_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'not_in_game';
  end if;

  if v_player.locked_in then
    raise exception 'already_locked_in';
  end if;

  if v_player.lives = 0 then
    raise exception 'no_lives_left';
  end if;

  if p_card_ids is null or array_length(p_card_ids, 1) <> 5 then
    raise exception 'wrong_card_count';
  end if;

  if (select count(distinct id) from unnest(p_card_ids) as id) <> 5 then
    raise exception 'duplicate_card';
  end if;

  select * into v_hand
  from hands
  where game_id = p_game_id and user_id = auth.uid() and round = v_game.round;

  if not found then
    raise exception 'no_hand';
  end if;

  select jsonb_agg(card order by ordinality) into v_program
  from unnest(p_card_ids) with ordinality as chosen(id, ordinality)
  join jsonb_array_elements(v_hand.cards) as card on card ->> 'id' = chosen.id;

  if v_program is null or jsonb_array_length(v_program) <> 5 then
    raise exception 'card_not_in_hand';
  end if;

  insert into programs (game_id, user_id, round, cards)
  values (p_game_id, auth.uid(), v_game.round, v_program)
  on conflict (game_id, user_id) do update
    set round = excluded.round, cards = excluded.cards;

  update game_players
  set locked_in = true
  where game_id = p_game_id and user_id = auth.uid();

  update games
  set updated_at = now(),
      timer_started_at = coalesce(timer_started_at, now())
  where id = p_game_id;
end;
$$;

revoke all on function public.submit_program(uuid, text[]) from public;
grant execute on function public.submit_program(uuid, text[]) to authenticated;

alter table public.games replica identity full;
alter table public.game_players replica identity full;

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
