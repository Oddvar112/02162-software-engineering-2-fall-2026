alter table public.users
  add column display_name text;

update public.users
  set display_name = split_part(email, '@', 1)
  where display_name is null;

alter table public.users
  alter column display_name set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

alter table public.users
  drop column email;

drop policy if exists "Users can read their own user data" on public.users;

create policy "users_select_authenticated" on public.users
  for select to authenticated
  using (true);

grant select on public.users to authenticated;
