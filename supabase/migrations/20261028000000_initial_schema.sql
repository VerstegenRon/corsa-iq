-- CorsaIQ initial schema. See docs/datamodel.md.
-- Units: times in ms, pressure in bar, temperature in °C, lengths in mm, money in cents.

-- ---------------------------------------------------------------------------
-- 1. Accounts and ownership
-- ---------------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  locale        text not null default 'nl' check (locale in ('nl', 'en', 'de', 'fr')),
  unit_system   text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  currency      char(3) not null default 'EUR',
  created_at    timestamptz not null default now()
);

create table public.garages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text not null default 'free' check (plan in ('free', 'hobby', 'pro', 'team')),
  currency    char(3) not null default 'EUR',
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

create table public.garage_members (
  garage_id  uuid not null references public.garages (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'mechanic', 'driver', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (garage_id, user_id)
);

create index garage_members_user_id_idx on public.garage_members (user_id);

create table public.drivers (
  id              uuid primary key default gen_random_uuid(),
  garage_id       uuid not null references public.garages (id) on delete cascade,
  user_id         uuid references auth.users (id) on delete set null,
  name            text not null,
  race_number     text,
  weight_kg       numeric(5, 2),
  licence_number  text,
  created_at      timestamptz not null default now()
);

create index drivers_garage_id_idx on public.drivers (garage_id);

-- ---------------------------------------------------------------------------
-- 2. Kart and parts
-- ---------------------------------------------------------------------------

create table public.karts (
  id             uuid primary key default gen_random_uuid(),
  garage_id      uuid not null references public.garages (id) on delete cascade,
  name           text not null,
  chassis_brand  text,
  chassis_model  text,
  chassis_year   int,
  homologation   text,
  serial_number  text,
  class          text,
  status         text not null default 'active' check (status in ('active', 'spare', 'sold', 'retired')),
  notes          text,
  created_at     timestamptz not null default now()
);

create index karts_garage_id_idx on public.karts (garage_id);

create table public.parts (
  id                    uuid primary key default gen_random_uuid(),
  garage_id             uuid not null references public.garages (id) on delete cascade,
  category              text not null check (category in (
                          'engine', 'carburettor', 'exhaust', 'tyre_set', 'rim_set', 'rear_axle',
                          'sprocket', 'chain', 'seat', 'brake_disc', 'brake_pads', 'steering_wheel',
                          'front_hubs', 'spindle', 'bumper_bodywork', 'data_logger', 'other')),
  brand                 text,
  model                 text,
  serial_number         text,
  spec                  jsonb not null default '{}'::jsonb,
  status                text not null default 'in_stock' check (status in ('in_stock', 'installed', 'worn', 'sold', 'discarded')),
  purchased_on          date,
  purchase_price_cents  int check (purchase_price_cents >= 0),
  usage_limit_minutes   int check (usage_limit_minutes > 0),
  notes                 text,
  created_at            timestamptz not null default now()
);

create index parts_garage_id_category_idx on public.parts (garage_id, category);

create table public.part_installations (
  id            uuid primary key default gen_random_uuid(),
  part_id       uuid not null references public.parts (id) on delete cascade,
  kart_id       uuid not null references public.karts (id) on delete cascade,
  installed_at  timestamptz not null default now(),
  removed_at    timestamptz,
  check (removed_at is null or removed_at >= installed_at)
);

-- A part can only be mounted on one kart at a time.
create unique index part_installations_one_active_idx
  on public.part_installations (part_id) where removed_at is null;
create index part_installations_kart_id_idx on public.part_installations (kart_id);

create table public.maintenance_records (
  id            uuid primary key default gen_random_uuid(),
  garage_id     uuid not null references public.garages (id) on delete cascade,
  part_id       uuid references public.parts (id) on delete cascade,
  kart_id       uuid references public.karts (id) on delete cascade,
  performed_on  date not null,
  type          text not null check (type in ('revision', 'service', 'repair', 'inspection')),
  performed_by  text,
  description   text,
  resets_usage  boolean not null default false,
  created_at    timestamptz not null default now(),
  check (part_id is not null or kart_id is not null)
);

create index maintenance_records_part_id_idx on public.maintenance_records (part_id);
create index maintenance_records_kart_id_idx on public.maintenance_records (kart_id);

-- ---------------------------------------------------------------------------
-- 3. Seasons, tracks and events
-- ---------------------------------------------------------------------------

create table public.seasons (
  id            uuid primary key default gen_random_uuid(),
  garage_id     uuid not null references public.garages (id) on delete cascade,
  driver_id     uuid references public.drivers (id) on delete set null,
  name          text not null,
  year          int not null,
  class         text,
  championship  text,
  budget_cents  int check (budget_cents >= 0),
  created_at    timestamptz not null default now()
);

create index seasons_garage_id_idx on public.seasons (garage_id);

-- Shared catalogue. created_by_garage_id null = official entry.
create table public.tracks (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  country               char(2),
  latitude              numeric(9, 6),
  longitude             numeric(9, 6),
  created_by_garage_id  uuid references public.garages (id) on delete set null,
  created_at            timestamptz not null default now()
);

create table public.track_layouts (
  id            uuid primary key default gen_random_uuid(),
  track_id      uuid not null references public.tracks (id) on delete cascade,
  name          text not null,
  length_m      int check (length_m > 0),
  sector_count  int check (sector_count > 0),
  created_at    timestamptz not null default now()
);

create index track_layouts_track_id_idx on public.track_layouts (track_id);

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  garage_id        uuid not null references public.garages (id) on delete cascade,
  season_id        uuid references public.seasons (id) on delete set null,
  track_id         uuid not null references public.tracks (id),
  name             text not null,
  type             text not null check (type in ('training', 'race', 'test')),
  starts_on        date not null,
  ends_on          date,
  result_position  int check (result_position > 0),
  notes            text,
  created_at       timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create index events_garage_id_starts_on_idx on public.events (garage_id, starts_on desc);
create index events_season_id_idx on public.events (season_id);

-- ---------------------------------------------------------------------------
-- 4. Setups, imports, sessions and laps
-- ---------------------------------------------------------------------------

create table public.setup_templates (
  id          uuid primary key default gen_random_uuid(),
  garage_id   uuid not null references public.garages (id) on delete cascade,
  kart_id     uuid references public.karts (id) on delete set null,
  track_id    uuid references public.tracks (id) on delete set null,
  name        text not null,
  "values"    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index setup_templates_garage_id_idx on public.setup_templates (garage_id);

-- Snapshot: immutable once a session references it (see trigger below).
create table public.setups (
  id               uuid primary key default gen_random_uuid(),
  garage_id        uuid not null references public.garages (id) on delete cascade,
  template_id      uuid references public.setup_templates (id) on delete set null,
  parent_setup_id  uuid references public.setups (id) on delete set null,
  "values"         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index setups_garage_id_idx on public.setups (garage_id);

create table public.data_imports (
  id               uuid primary key default gen_random_uuid(),
  garage_id        uuid not null references public.garages (id) on delete cascade,
  uploaded_by      uuid references auth.users (id) on delete set null default auth.uid(),
  source           text not null check (source in ('aim', 'alfano', 'unipro', 'mychron_cloud', 'csv', 'manual')),
  file_path        text,
  file_format      text,
  status           text not null default 'pending' check (status in ('pending', 'parsed', 'failed', 'needs_mapping')),
  error            text,
  channel_summary  jsonb,
  telemetry_path   text,
  created_at       timestamptz not null default now()
);

create index data_imports_garage_id_idx on public.data_imports (garage_id, created_at desc);

create table public.sessions (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events (id) on delete cascade,
  kart_id          uuid not null references public.karts (id),
  driver_id        uuid not null references public.drivers (id),
  setup_id         uuid references public.setups (id),
  track_layout_id  uuid references public.track_layouts (id),
  data_import_id   uuid references public.data_imports (id) on delete set null,
  type             text not null check (type in ('practice', 'qualifying', 'heat', 'prefinal', 'final', 'test')),
  started_at       timestamptz not null,
  duration_s       int check (duration_s >= 0),
  best_lap_ms      int check (best_lap_ms > 0),
  conditions       jsonb not null default '{}'::jsonb,
  driver_feedback  text,
  position         int check (position > 0),
  created_at       timestamptz not null default now()
);

create index sessions_event_id_idx on public.sessions (event_id);
create index sessions_kart_id_idx on public.sessions (kart_id);
create index sessions_driver_id_idx on public.sessions (driver_id);
create index sessions_setup_id_idx on public.sessions (setup_id);

create table public.session_parts (
  session_id  uuid not null references public.sessions (id) on delete cascade,
  part_id     uuid not null references public.parts (id) on delete cascade,
  primary key (session_id, part_id)
);

create index session_parts_part_id_idx on public.session_parts (part_id);

create table public.laps (
  id                bigint generated always as identity primary key,
  session_id        uuid not null references public.sessions (id) on delete cascade,
  lap_number        int not null check (lap_number >= 0),
  lap_time_ms       int not null check (lap_time_ms > 0),
  is_valid          boolean not null default true,
  is_pit_lap        boolean not null default false,
  max_speed_kmh     numeric(6, 2),
  min_speed_kmh     numeric(6, 2),
  max_rpm           int,
  max_water_temp_c  numeric(5, 1),
  max_egt_c         numeric(5, 1),
  unique (session_id, lap_number)
);

create table public.lap_sectors (
  lap_id          bigint not null references public.laps (id) on delete cascade,
  sector_number   int not null check (sector_number > 0),
  sector_time_ms  int not null check (sector_time_ms > 0),
  primary key (lap_id, sector_number)
);

-- ---------------------------------------------------------------------------
-- 5. Expenses
-- ---------------------------------------------------------------------------

create table public.expenses (
  id                     uuid primary key default gen_random_uuid(),
  garage_id              uuid not null references public.garages (id) on delete cascade,
  season_id              uuid references public.seasons (id) on delete set null,
  event_id               uuid references public.events (id) on delete set null,
  part_id                uuid references public.parts (id) on delete set null,
  maintenance_record_id  uuid references public.maintenance_records (id) on delete set null,
  spent_on               date not null,
  category               text not null check (category in (
                           'entry_fee', 'tyres', 'fuel_oil', 'parts', 'engine_revision', 'track_rental',
                           'travel', 'accommodation', 'licence', 'gear', 'other')),
  amount_cents           int not null check (amount_cents >= 0),
  currency               char(3) not null default 'EUR',
  description            text,
  receipt_path           text,
  created_at             timestamptz not null default now()
);

create index expenses_garage_id_spent_on_idx on public.expenses (garage_id, spent_on desc);
create index expenses_season_id_idx on public.expenses (season_id);

-- ---------------------------------------------------------------------------
-- Derived data
-- ---------------------------------------------------------------------------

-- Minutes each part has run since its last usage-resetting maintenance.
create view public.part_usage
with (security_invoker = true) as
select
  p.id as part_id,
  p.garage_id,
  p.usage_limit_minutes,
  coalesce(sum(s.duration_s) filter (
    where last_reset.performed_on is null or s.started_at::date > last_reset.performed_on
  ), 0) / 60 as minutes_since_reset,
  coalesce(sum(s.duration_s), 0) / 60 as minutes_total,
  count(s.id) as session_count
from public.parts p
left join public.session_parts sp on sp.part_id = p.id
left join public.sessions s on s.id = sp.session_id
left join lateral (
  select max(m.performed_on) as performed_on
  from public.maintenance_records m
  where m.part_id = p.id and m.resets_usage
) last_reset on true
group by p.id, p.garage_id, p.usage_limit_minutes;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- New user: profile + personal garage with the user as owner.
create function public.handle_new_user()
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

  insert into public.drivers (garage_id, user_id, name) values (new_garage_id, new.id, user_name);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Whoever creates a garage becomes its owner.
create function public.handle_new_garage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.garage_members (garage_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_garage_created
  after insert on public.garages
  for each row execute function public.handle_new_garage();

-- Setups referenced by a session are frozen; create a new setup instead.
create function public.prevent_used_setup_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.sessions where setup_id = old.id) then
    raise exception 'Setup % is used by a session and cannot be changed; create a new setup instead', old.id;
  end if;
  return new;
end;
$$;

create trigger setups_immutable_when_used
  before update on public.setups
  for each row execute function public.prevent_used_setup_update();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

create function public.is_garage_member(target_garage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.garage_members
    where garage_id = target_garage_id and user_id = auth.uid()
  );
$$;

create function public.is_garage_owner(target_garage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.garage_members
    where garage_id = target_garage_id and user_id = auth.uid() and role = 'owner'
  );
$$;

alter table public.profiles            enable row level security;
alter table public.garages             enable row level security;
alter table public.garage_members      enable row level security;
alter table public.drivers             enable row level security;
alter table public.karts               enable row level security;
alter table public.parts               enable row level security;
alter table public.part_installations  enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.seasons             enable row level security;
alter table public.tracks              enable row level security;
alter table public.track_layouts       enable row level security;
alter table public.events              enable row level security;
alter table public.setup_templates     enable row level security;
alter table public.setups              enable row level security;
alter table public.data_imports        enable row level security;
alter table public.sessions            enable row level security;
alter table public.session_parts       enable row level security;
alter table public.laps                enable row level security;
alter table public.lap_sectors         enable row level security;
alter table public.expenses            enable row level security;

-- Profiles: only your own.
create policy "own profile" on public.profiles
  for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Garages: members read, owners change, any signed-in user may create one.
-- created_by check lets "insert ... returning" see the row before the owner trigger's membership is visible.
create policy "members read garage" on public.garages
  for select to authenticated using (public.is_garage_member(id) or created_by = auth.uid());
create policy "create garage" on public.garages
  for insert to authenticated with check (created_by = auth.uid());
create policy "owners update garage" on public.garages
  for update to authenticated using (public.is_garage_owner(id));
create policy "owners delete garage" on public.garages
  for delete to authenticated using (public.is_garage_owner(id));

-- Members: members see each other, owners manage membership.
create policy "members read members" on public.garage_members
  for select to authenticated using (public.is_garage_member(garage_id));
create policy "owners manage members" on public.garage_members
  for all to authenticated
  using (public.is_garage_owner(garage_id)) with check (public.is_garage_owner(garage_id));

-- Tables with their own garage_id: full access for members.
do $$
declare
  t text;
begin
  foreach t in array array[
    'drivers', 'karts', 'parts', 'maintenance_records', 'seasons', 'events',
    'setup_templates', 'setups', 'data_imports', 'expenses'
  ] loop
    execute format(
      'create policy "garage members" on public.%I for all to authenticated
         using (public.is_garage_member(garage_id))
         with check (public.is_garage_member(garage_id))',
      t
    );
  end loop;
end;
$$;

-- Tables that inherit access through a parent.
create policy "garage members" on public.part_installations
  for all to authenticated
  using (exists (select 1 from public.karts k where k.id = kart_id and public.is_garage_member(k.garage_id)))
  with check (
    exists (select 1 from public.karts k where k.id = kart_id and public.is_garage_member(k.garage_id))
    and exists (select 1 from public.parts p where p.id = part_id and public.is_garage_member(p.garage_id))
  );

create policy "garage members" on public.sessions
  for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and public.is_garage_member(e.garage_id)))
  with check (exists (select 1 from public.events e where e.id = event_id and public.is_garage_member(e.garage_id)));

create policy "garage members" on public.session_parts
  for all to authenticated
  using (exists (
    select 1 from public.sessions s join public.events e on e.id = s.event_id
    where s.id = session_id and public.is_garage_member(e.garage_id)))
  with check (exists (
    select 1 from public.sessions s join public.events e on e.id = s.event_id
    where s.id = session_id and public.is_garage_member(e.garage_id)));

create policy "garage members" on public.laps
  for all to authenticated
  using (exists (
    select 1 from public.sessions s join public.events e on e.id = s.event_id
    where s.id = session_id and public.is_garage_member(e.garage_id)))
  with check (exists (
    select 1 from public.sessions s join public.events e on e.id = s.event_id
    where s.id = session_id and public.is_garage_member(e.garage_id)));

create policy "garage members" on public.lap_sectors
  for all to authenticated
  using (exists (
    select 1 from public.laps l
    join public.sessions s on s.id = l.session_id
    join public.events e on e.id = s.event_id
    where l.id = lap_id and public.is_garage_member(e.garage_id)))
  with check (exists (
    select 1 from public.laps l
    join public.sessions s on s.id = l.session_id
    join public.events e on e.id = s.event_id
    where l.id = lap_id and public.is_garage_member(e.garage_id)));

-- Tracks: everyone signed in reads; garages add and edit their own entries.
create policy "read tracks" on public.tracks
  for select to authenticated using (true);
create policy "add own tracks" on public.tracks
  for insert to authenticated
  with check (created_by_garage_id is not null and public.is_garage_member(created_by_garage_id));
create policy "edit own tracks" on public.tracks
  for update to authenticated
  using (created_by_garage_id is not null and public.is_garage_member(created_by_garage_id));

create policy "read track layouts" on public.track_layouts
  for select to authenticated using (true);
create policy "manage own track layouts" on public.track_layouts
  for all to authenticated
  using (exists (select 1 from public.tracks t where t.id = track_id
                 and t.created_by_garage_id is not null and public.is_garage_member(t.created_by_garage_id)))
  with check (exists (select 1 from public.tracks t where t.id = track_id
                      and t.created_by_garage_id is not null and public.is_garage_member(t.created_by_garage_id)));

-- ---------------------------------------------------------------------------
-- Storage: private buckets, files stored under "<garage_id>/..."
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('logger-files', 'logger-files', false),
       ('receipts', 'receipts', false)
on conflict (id) do nothing;

create function public.storage_garage_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(object_name))[1])::uuid
  end;
$$;

create policy "garage members access files" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('logger-files', 'receipts')
    and public.is_garage_member(public.storage_garage_id(name))
  )
  with check (
    bucket_id in ('logger-files', 'receipts')
    and public.is_garage_member(public.storage_garage_id(name))
  );
