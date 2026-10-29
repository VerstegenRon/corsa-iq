-- Pre-start checklist ("Klaar voor Q1?"). A pre-start round belongs to an event, a kart and the
-- session about to be driven (by its label, e.g. "Q1"), because that session does not exist yet;
-- session_id is filled in once the session is saved. Each round holds tyre pressure readings and
-- checks; locking the setup marks the setup as the one to race with.

create table public.prestart_checks (
  id             uuid primary key default gen_random_uuid(),
  garage_id      uuid not null references public.garages (id) on delete cascade,
  event_id       uuid not null references public.events (id) on delete cascade,
  kart_id        uuid not null references public.karts (id) on delete cascade,
  setup_id       uuid references public.setups (id) on delete set null,
  session_label  text not null check (length(session_label) between 1 and 20),
  session_type   text check (session_type in ('practice', 'qualifying', 'heat', 'prefinal', 'final', 'test')),
  session_id     uuid references public.sessions (id) on delete set null,
  locked_at      timestamptz,
  locked_by      uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (event_id, kart_id, session_label)
);

create index prestart_checks_garage_id_idx on public.prestart_checks (garage_id);
create index prestart_checks_kart_id_idx on public.prestart_checks (kart_id);
create index prestart_checks_setup_id_idx on public.prestart_checks (setup_id);
create index prestart_checks_session_id_idx on public.prestart_checks (session_id);

alter table public.prestart_checks enable row level security;

-- Members of the garage, for an event and a kart of that same garage.
create policy "garage members" on public.prestart_checks
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (
    private.is_garage_member(garage_id)
    and exists (select 1 from public.events e where e.id = event_id and e.garage_id = prestart_checks.garage_id)
    and exists (select 1 from public.karts k where k.id = kart_id and k.garage_id = prestart_checks.garage_id)
  );

create table public.tyre_pressure_readings (
  id                 uuid primary key default gen_random_uuid(),
  garage_id          uuid not null references public.garages (id) on delete cascade,
  prestart_check_id  uuid not null references public.prestart_checks (id) on delete cascade,
  corner             text not null check (corner in ('VL', 'VR', 'AL', 'AR')),
  temp_state         text not null default 'cold' check (temp_state in ('cold', 'hot')),
  bar                numeric(4, 3) not null check (bar > 0 and bar < 5),
  measured_at        timestamptz not null default now(),
  measured_by        uuid default auth.uid() references auth.users (id) on delete set null
);

create index tyre_pressure_readings_check_idx on public.tyre_pressure_readings (prestart_check_id, corner, measured_at desc);
create index tyre_pressure_readings_garage_id_idx on public.tyre_pressure_readings (garage_id);
create index tyre_pressure_readings_measured_by_idx on public.tyre_pressure_readings (measured_by);

alter table public.tyre_pressure_readings enable row level security;

create policy "garage members" on public.tyre_pressure_readings
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (
    private.is_garage_member(garage_id)
    and exists (select 1 from public.prestart_checks c where c.id = prestart_check_id and c.garage_id = tyre_pressure_readings.garage_id)
  );

create table public.session_checks (
  id                 uuid primary key default gen_random_uuid(),
  garage_id          uuid not null references public.garages (id) on delete cascade,
  prestart_check_id  uuid not null references public.prestart_checks (id) on delete cascade,
  key                text not null check (length(key) between 1 and 60),
  target             text check (length(target) <= 120),
  tolerance          numeric,
  value              text check (length(value) <= 120),
  status             text not null default 'open' check (status in ('ok', 'warn', 'fail', 'open')),
  checked_by         uuid default auth.uid() references auth.users (id) on delete set null,
  checked_at         timestamptz not null default now(),
  unique (prestart_check_id, key)
);

create index session_checks_garage_id_idx on public.session_checks (garage_id);
create index session_checks_checked_by_idx on public.session_checks (checked_by);

alter table public.session_checks enable row level security;

create policy "garage members" on public.session_checks
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (
    private.is_garage_member(garage_id)
    and exists (select 1 from public.prestart_checks c where c.id = prestart_check_id and c.garage_id = session_checks.garage_id)
  );

-- A locked setup is the one to race with; used setups are frozen already, this marks the choice.
alter table public.setups
  add column locked_at timestamptz,
  add column locked_by uuid references auth.users (id) on delete set null;

create index setups_locked_by_idx on public.setups (locked_by);
create index prestart_checks_locked_by_idx on public.prestart_checks (locked_by);

-- A used setup stays frozen, except for locking it: a change to only locked_at and locked_by is allowed.
create or replace function private.prevent_used_setup_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'locked_at' - 'locked_by') = (to_jsonb(old) - 'locked_at' - 'locked_by') then
    return new;
  end if;
  if exists (select 1 from public.sessions where setup_id = old.id) then
    raise exception 'Setup % is used by a session and cannot be changed; create a new setup instead', old.id;
  end if;
  return new;
end;
$$;
