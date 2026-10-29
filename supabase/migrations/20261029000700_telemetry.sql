-- Telemetry per lap for the Analyse screen ("Waar zit de tijd?").
--
-- 1. lap_channels: one resampled channel file per lap (distance domain, every sample_m metres) in the
--    private "telemetry" bucket under "<garage_id>/".
-- 2. track_layout_corners: the corners of a layout, per garage (layouts are shared between garages,
--    corner names and positions are a team's own). Filled from the reference lap's speed minima.
-- 3. sessions.reference_lap_id: the lap this session is compared against by default.

create table public.lap_channels (
  lap_id        bigint primary key references public.laps (id) on delete cascade,
  garage_id     uuid not null references public.garages (id) on delete cascade,
  storage_path  text not null,
  sample_m      numeric(4, 2) not null check (sample_m > 0),
  length_m      numeric(7, 1) not null check (length_m > 0),
  channels      text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create index lap_channels_garage_id_idx on public.lap_channels (garage_id);

alter table public.lap_channels enable row level security;

create policy "garage members" on public.lap_channels
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (
    private.is_garage_member(garage_id)
    and exists (
      select 1 from public.laps l
      join public.sessions s on s.id = l.session_id
      join public.events e on e.id = s.event_id
      where l.id = lap_id and e.garage_id = lap_channels.garage_id));

create table public.track_layout_corners (
  id               uuid primary key default gen_random_uuid(),
  garage_id        uuid not null references public.garages (id) on delete cascade,
  track_layout_id  uuid not null references public.track_layouts (id) on delete cascade,
  number           int not null check (number > 0),
  name             text,
  apex_m           numeric(7, 1) not null check (apex_m >= 0),
  start_m          numeric(7, 1) not null check (start_m >= 0),
  end_m            numeric(7, 1) not null,
  created_at       timestamptz not null default now(),
  unique (garage_id, track_layout_id, number),
  check (start_m <= apex_m and apex_m <= end_m)
);

create index track_layout_corners_layout_idx on public.track_layout_corners (track_layout_id);

alter table public.track_layout_corners enable row level security;

create policy "garage members" on public.track_layout_corners
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (private.is_garage_member(garage_id));

alter table public.sessions
  add column reference_lap_id bigint references public.laps (id) on delete set null;

create index sessions_reference_lap_id_idx on public.sessions (reference_lap_id);

-- Storage: the telemetry bucket follows the same "<garage_id>/..." rule as the logger files.
insert into storage.buckets (id, name, public)
values ('telemetry', 'telemetry', false)
on conflict (id) do nothing;

drop policy "garage members access files" on storage.objects;
create policy "garage members access files" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('logger-files', 'receipts', 'telemetry')
    and private.is_garage_member(private.storage_garage_id(name))
  )
  with check (
    bucket_id in ('logger-files', 'receipts', 'telemetry')
    and private.is_garage_member(private.storage_garage_id(name))
  );
