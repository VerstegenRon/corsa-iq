-- Teams: roles that the database enforces, and invitations by link.
--
-- owner     everything: members, the garage, costs
-- mechanic  edits all racing and material data, sees and enters costs
-- driver    edits all racing and material data, no costs
-- viewer    reads racing and material data, changes nothing, no costs
--
-- Every "garage members" policy (one rule: member = everything) becomes two: members read, and
-- owner/mechanic/driver write. Costs and receipts are for owner and mechanic only.

-- ---------------------------------------------------------------------------
-- 1. Role checks
-- ---------------------------------------------------------------------------

create function private.can_edit_garage(target_garage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.garage_members
    where garage_id = target_garage_id and user_id = (select auth.uid()) and role in ('owner', 'mechanic', 'driver')
  );
$$;

create function private.can_see_costs(target_garage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.garage_members
    where garage_id = target_garage_id and user_id = (select auth.uid()) and role in ('owner', 'mechanic')
  );
$$;

revoke execute on function private.can_edit_garage(uuid) from public, anon;
revoke execute on function private.can_see_costs(uuid) from public, anon;
grant execute on function private.can_edit_garage(uuid) to authenticated;
grant execute on function private.can_see_costs(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Read for members, write for editors
-- ---------------------------------------------------------------------------

do $$
declare
  p record;
  read_using text;
  write_using text;
  write_check text;
begin
  for p in
    select tablename, qual, with_check from pg_policies
    where schemaname = 'public' and policyname = 'garage members' and cmd = 'ALL'
  loop
    read_using := p.qual;
    write_using := replace(p.qual, 'private.is_garage_member(', 'private.can_edit_garage(');
    write_check := replace(coalesce(p.with_check, p.qual), 'private.is_garage_member(', 'private.can_edit_garage(');
    if p.tablename = 'expenses' then
      read_using := replace(p.qual, 'private.is_garage_member(', 'private.can_see_costs(');
      write_using := read_using;
      write_check := replace(coalesce(p.with_check, p.qual), 'private.is_garage_member(', 'private.can_see_costs(');
    end if;
    execute format('drop policy "garage members" on public.%I', p.tablename);
    execute format('create policy "members read" on public.%I for select to authenticated using (%s)', p.tablename, read_using);
    execute format('create policy "editors add" on public.%I for insert to authenticated with check (%s)', p.tablename, write_check);
    execute format('create policy "editors change" on public.%I for update to authenticated using (%s) with check (%s)', p.tablename, write_using, write_check);
    execute format('create policy "editors remove" on public.%I for delete to authenticated using (%s)', p.tablename, write_using);
  end loop;
end;
$$;

-- Files: logger exports and telemetry like the data, receipts like the costs.
drop policy "garage members access files" on storage.objects;
create policy "members read files" on storage.objects
  for select to authenticated
  using (
    (bucket_id in ('logger-files', 'telemetry') and private.is_garage_member(private.storage_garage_id(name)))
    or (bucket_id = 'receipts' and private.can_see_costs(private.storage_garage_id(name)))
  );
create policy "editors add files" on storage.objects
  for insert to authenticated
  with check (
    (bucket_id in ('logger-files', 'telemetry') and private.can_edit_garage(private.storage_garage_id(name)))
    or (bucket_id = 'receipts' and private.can_see_costs(private.storage_garage_id(name)))
  );
create policy "editors change files" on storage.objects
  for update to authenticated
  using (
    (bucket_id in ('logger-files', 'telemetry') and private.can_edit_garage(private.storage_garage_id(name)))
    or (bucket_id = 'receipts' and private.can_see_costs(private.storage_garage_id(name)))
  );
create policy "editors remove files" on storage.objects
  for delete to authenticated
  using (
    (bucket_id in ('logger-files', 'telemetry') and private.can_edit_garage(private.storage_garage_id(name)))
    or (bucket_id = 'receipts' and private.can_see_costs(private.storage_garage_id(name)))
  );

-- ---------------------------------------------------------------------------
-- 3. Members: leaving, and always one owner
-- ---------------------------------------------------------------------------

create policy "members leave" on public.garage_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

create function private.keep_an_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and not exists (
       select 1 from public.garage_members
       where garage_id = old.garage_id and role = 'owner' and user_id <> old.user_id)
     -- The garage itself is being deleted: its members go with it.
     and exists (select 1 from public.garages where id = old.garage_id)
  then
    raise exception 'A garage needs at least one owner' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger keep_an_owner
  before update or delete on public.garage_members
  for each row execute function private.keep_an_owner();

-- ---------------------------------------------------------------------------
-- 4. Invitations by link
-- ---------------------------------------------------------------------------

create table public.garage_invites (
  id           uuid primary key default gen_random_uuid(),
  garage_id    uuid not null references public.garages (id) on delete cascade,
  role         text not null check (role in ('owner', 'mechanic', 'driver', 'viewer')),
  label        text check (char_length(label) <= 80),
  token        text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '7 days',
  revoked_at   timestamptz,
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users (id) on delete set null
);

create index garage_invites_garage_idx on public.garage_invites (garage_id, created_at desc);
create index garage_invites_created_by_idx on public.garage_invites (created_by);
create index garage_invites_accepted_by_idx on public.garage_invites (accepted_by);

alter table public.garage_invites enable row level security;

create policy "owners manage invites" on public.garage_invites
  for all to authenticated
  using (private.is_garage_owner(garage_id))
  with check (private.is_garage_owner(garage_id));

-- What an invitation is for, shown before accepting. Only for a signed-in user holding the token.
create function public.garage_invite_info(p_token text)
returns table (garage_name text, role text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select g.name, i.role,
         case
           when i.revoked_at is not null then 'revoked'
           when i.accepted_at is not null then 'used'
           when i.expires_at < now() then 'expired'
           else 'open'
         end
  from public.garage_invites i
  join public.garages g on g.id = i.garage_id
  where i.token = p_token;
$$;

-- Joins the garage with the invitation's role; used once. A member already keeps their role.
create function public.accept_garage_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.garage_invites;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  select * into invite from public.garage_invites where token = p_token for update;
  if invite.id is null or invite.revoked_at is not null then
    raise exception 'Invite not found' using errcode = 'P0002';
  end if;
  if invite.accepted_at is not null then
    if invite.accepted_by = (select auth.uid()) then return invite.garage_id; end if;
    raise exception 'Invite already used' using errcode = 'P0001';
  end if;
  if invite.expires_at < now() then
    raise exception 'Invite expired' using errcode = 'P0001';
  end if;

  insert into public.garage_members (garage_id, user_id, role)
  values (invite.garage_id, (select auth.uid()), invite.role)
  on conflict (garage_id, user_id) do nothing;

  update public.garage_invites
  set accepted_at = now(), accepted_by = (select auth.uid())
  where id = invite.id;

  return invite.garage_id;
end;
$$;

revoke execute on function public.garage_invite_info(text) from public, anon;
revoke execute on function public.accept_garage_invite(text) from public, anon;
grant execute on function public.garage_invite_info(text) to authenticated;
grant execute on function public.accept_garage_invite(text) to authenticated;
