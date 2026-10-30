-- Paid extras on top of a plan: extra drivers (Pro, Team) and extra karts (Pro). Each is a monthly
-- Stripe subscription of its own; the webhook keeps these counts in step. On the garage, so every
-- member sees the same limit, and written by the server only (members may only update name and currency).
alter table public.garages
  add column extra_drivers int not null default 0 check (extra_drivers >= 0),
  add column extra_karts   int not null default 0 check (extra_karts >= 0);

create or replace function private.enforce_plan_limit()
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

  select private.plan_limit(g.plan, what)
         + case what when 'karts' then g.extra_karts when 'drivers' then g.extra_drivers else 0 end
    into allowed
    from public.garages g
   where g.id = new.garage_id;
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
