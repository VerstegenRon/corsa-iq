-- The team list: names and e-mail addresses of the members, for members only.

create function public.garage_team(p_garage_id uuid)
returns table (user_id uuid, role text, joined_at timestamptz, display_name text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, m.role, m.created_at, p.display_name, u.email::text
  from public.garage_members m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.garage_id = p_garage_id and private.is_garage_member(p_garage_id)
  order by case m.role when 'owner' then 0 when 'mechanic' then 1 when 'driver' then 2 else 3 end, m.created_at;
$$;

revoke execute on function public.garage_team(uuid) from public, anon;
grant execute on function public.garage_team(uuid) to authenticated;
