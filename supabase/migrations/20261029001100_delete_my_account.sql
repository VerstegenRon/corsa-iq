-- Deleting your own account (GDPR). A garage where you are the only member goes with you, with all
-- its data. A garage with other members is never deleted this way: as its last owner you first make
-- someone else owner. Removing the login takes the profile, memberships and calendar link with it;
-- records you made in a team stay with the team, without your name.
--
-- Uploaded files of the deleted garages are removed through the Storage API before this is called
-- (storage rows cannot be deleted in SQL).

-- The garages that would be deleted, and those that block deleting the account.
create function public.my_account_garages()
returns table (garage_id uuid, garage_name text, role text, members int, outcome text)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name, m.role,
         (select count(*)::int from public.garage_members x where x.garage_id = g.id) as members,
         case
           when (select count(*) from public.garage_members x where x.garage_id = g.id) = 1 then 'deleted'
           when m.role = 'owner'
                and not exists (select 1 from public.garage_members x
                                where x.garage_id = g.id and x.role = 'owner' and x.user_id <> m.user_id) then 'blocked'
           else 'left'
         end
  from public.garage_members m
  join public.garages g on g.id = m.garage_id
  where m.user_id = (select auth.uid());
$$;

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  doomed uuid[];
  own_tracks uuid[];
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if exists (select 1 from public.my_account_garages() where outcome = 'blocked') then
    raise exception 'Make someone else owner first' using errcode = 'P0001';
  end if;

  select array_agg(garage_id) into doomed from public.my_account_garages() where outcome = 'deleted';
  -- Circuits a garage added are only visible to that garage; without it they would look official.
  select array_agg(id) into own_tracks from public.tracks where created_by_garage_id = any(coalesce(doomed, '{}'));

  delete from public.garages where id = any(coalesce(doomed, '{}'));
  delete from public.tracks where id = any(coalesce(own_tracks, '{}'));

  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.my_account_garages() from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.my_account_garages() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
