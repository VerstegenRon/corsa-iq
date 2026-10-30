-- Plan limits: how many karts, drivers and team members each plan allows. Off during the launch
-- phase, when everything is free; switched on for every garage at once with:
--   update private.app_config set plan_limits_active = true;
-- The numbers mirror COMPARISON in src/lib/pricing.ts. Garages above their limit keep what they
-- have; they cannot add more.

create table private.app_config (
  id                 boolean primary key default true check (id),
  plan_limits_active boolean not null default false
);
alter table private.app_config enable row level security;
insert into private.app_config default values;

create function public.plan_limits_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select plan_limits_active from private.app_config), false);
$$;
revoke execute on function public.plan_limits_active() from public;
grant execute on function public.plan_limits_active() to anon, authenticated;

-- How many a plan allows; null is no limit.
create function private.plan_limit(p_plan text, p_what text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_what
    when 'karts'   then case p_plan when 'free' then 1 when 'hobby' then 2 when 'pro' then 3 else null end
    when 'drivers' then case p_plan when 'free' then 1 when 'hobby' then 1 when 'pro' then 2 else 5 end
    when 'members' then case p_plan when 'free' then 1 when 'hobby' then 1 when 'pro' then 5 else 10 end
  end;
$$;

-- Only karts in use count: active and spare, not sold or retired.
create function private.enforce_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  what text := tg_argv[0];
  allowed int;
  used int;
begin
  if not public.plan_limits_active() then
    return new;
  end if;
  if what = 'karts' then
    if new.status not in ('active', 'spare') then
      return new;
    end if;
    -- Already counted (active to spare, a rename): nothing new.
    if tg_op = 'UPDATE' and old.status in ('active', 'spare') and old.garage_id = new.garage_id then
      return new;
    end if;
  end if;

  select private.plan_limit(g.plan, what) into allowed from public.garages g where g.id = new.garage_id;
  if allowed is null then
    return new;
  end if;

  if what = 'karts' then
    select count(*) into used from public.karts
    where garage_id = new.garage_id and status in ('active', 'spare') and id <> new.id;
  elsif what = 'drivers' then
    select count(*) into used from public.drivers where garage_id = new.garage_id and id <> new.id;
  else
    select count(*) into used from public.garage_members where garage_id = new.garage_id and user_id <> new.user_id;
  end if;

  if used >= allowed then
    raise exception 'plan_limit:%', what using errcode = 'P0001', hint = allowed::text;
  end if;
  return new;
end;
$$;

create trigger karts_plan_limit
  before insert or update of status, garage_id on public.karts
  for each row execute function private.enforce_plan_limit('karts');
create trigger drivers_plan_limit
  before insert or update of garage_id on public.drivers
  for each row execute function private.enforce_plan_limit('drivers');
create trigger members_plan_limit
  before insert on public.garage_members
  for each row execute function private.enforce_plan_limit('members');
