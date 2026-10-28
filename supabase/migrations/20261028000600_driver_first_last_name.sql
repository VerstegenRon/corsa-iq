-- Drivers get a separate first and last name. `name` stays, computed by the database, so every
-- query and label that shows a driver's full name keeps working unchanged.
alter table public.drivers
  add column first_name text,
  add column last_name text;

-- Existing names: the first word becomes the first name, the rest the last name.
update public.drivers
set first_name = split_part(trim(name), ' ', 1),
    last_name = nullif(trim(substr(trim(name), length(split_part(trim(name), ' ', 1)) + 1)), '');

alter table public.drivers alter column first_name set not null;

-- Safe to drop: its content now lives in first_name / last_name and is recomputed below.
alter table public.drivers drop column name;
alter table public.drivers
  add column name text generated always as (trim(first_name || coalesce(' ' || last_name, ''))) stored;

-- Signup: the new user's driver gets the display name (or e-mail prefix) as first name.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_garage_id uuid;
  user_name text := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Driver');
begin
  insert into public.profiles (id, display_name) values (new.id, user_name);

  -- on_garage_created adds the owner membership.
  insert into public.garages (name, created_by) values (user_name, new.id)
  returning id into new_garage_id;

  insert into public.drivers (garage_id, user_id, first_name) values (new_garage_id, new.id, user_name);

  return new;
end;
$$;
