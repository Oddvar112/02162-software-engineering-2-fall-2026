alter table public.game_players
  add column draw_pile jsonb not null default '[]'::jsonb,
  add column discard_pile jsonb not null default '[]'::jsonb;