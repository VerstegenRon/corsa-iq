-- Live (block 5): a session followed while it is driven. Lap times come from the pit stopwatch now;
-- a logger bridge or circuit timing can write to the same tables later (`source`). When the session
-- ends it becomes an ordinary session with laps (`session_id`), so Analyse and the setup tree keep
-- working. All three tables are in the Realtime publication: every team device sees each lap at once.

create table public.live_sessions (
  id                uuid primary key default gen_random_uuid(),
  garage_id         uuid not null references public.garages (id) on delete cascade,
  event_id          uuid not null references public.events (id) on delete cascade,
  kart_id           uuid not null references public.karts (id),
  driver_id         uuid not null references public.drivers (id),
  session_type      text not null check (session_type in ('practice', 'qualifying', 'heat', 'prefinal', 'final', 'test')),
  label             text not null,
  planned_laps      int check (planned_laps > 0),
  reference_lap_id  bigint references public.laps (id) on delete set null,
  source            text not null default 'manual' check (source in ('manual', 'bridge', 'timing')),
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  session_id        uuid references public.sessions (id) on delete set null,
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now()
);

create index live_sessions_garage_idx on public.live_sessions (garage_id, started_at desc);
create index live_sessions_event_idx on public.live_sessions (event_id);
create index live_sessions_kart_idx on public.live_sessions (kart_id);
create index live_sessions_driver_idx on public.live_sessions (driver_id);
create index live_sessions_reference_idx on public.live_sessions (reference_lap_id);
create index live_sessions_session_idx on public.live_sessions (session_id);

create table public.live_laps (
  id                bigint generated always as identity primary key,
  live_session_id   uuid not null references public.live_sessions (id) on delete cascade,
  garage_id         uuid not null references public.garages (id) on delete cascade,
  lap_number        int not null check (lap_number >= 0),
  lap_time_ms       int not null check (lap_time_ms > 0),
  sectors_ms        int[] not null default '{}',
  position          int check (position > 0),
  gap_to_p1_ms      int,
  max_speed_kmh     numeric(6, 2),
  max_water_temp_c  numeric(5, 1),
  max_egt_c         numeric(5, 1),
  max_rpm           int,
  is_pit_lap        boolean not null default false,
  recorded_by       uuid references auth.users (id) on delete set null default auth.uid(),
  recorded_at       timestamptz not null default now(),
  unique (live_session_id, lap_number)
);

create index live_laps_garage_idx on public.live_laps (garage_id);

create table public.pit_messages (
  id                uuid primary key default gen_random_uuid(),
  garage_id         uuid not null references public.garages (id) on delete cascade,
  live_session_id   uuid references public.live_sessions (id) on delete cascade,
  text              text not null check (char_length(text) between 1 and 80),
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  cleared_at        timestamptz
);

create index pit_messages_garage_idx on public.pit_messages (garage_id, created_at desc);
create index pit_messages_live_session_idx on public.pit_messages (live_session_id);

alter table public.live_sessions enable row level security;
alter table public.live_laps enable row level security;
alter table public.pit_messages enable row level security;

create policy "garage members" on public.live_sessions
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (
    private.is_garage_member(garage_id)
    and exists (select 1 from public.events e where e.id = event_id and e.garage_id = live_sessions.garage_id)
    and exists (select 1 from public.karts k where k.id = kart_id and k.garage_id = live_sessions.garage_id)
    and exists (select 1 from public.drivers d where d.id = driver_id and d.garage_id = live_sessions.garage_id));

create policy "garage members" on public.live_laps
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (
    private.is_garage_member(garage_id)
    and exists (select 1 from public.live_sessions s where s.id = live_session_id and s.garage_id = live_laps.garage_id));

create policy "garage members" on public.pit_messages
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (
    private.is_garage_member(garage_id)
    and (live_session_id is null
         or exists (select 1 from public.live_sessions s where s.id = live_session_id and s.garage_id = pit_messages.garage_id)));

alter publication supabase_realtime add table public.live_sessions, public.live_laps, public.pit_messages;
