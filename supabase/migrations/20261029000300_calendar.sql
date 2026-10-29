-- The agenda: the garage's own appointments next to its events, and a private link per member to
-- subscribe to the agenda from a phone's calendar app.

create table public.calendar_items (
  id          uuid primary key default gen_random_uuid(),
  garage_id   uuid not null references public.garages (id) on delete cascade,
  title       text not null check (length(title) between 1 and 120),
  starts_on   date not null,
  ends_on     date check (ends_on >= starts_on),
  -- Optional time of day, in the garage's local time; without it the item lasts the whole day.
  starts_at   time,
  notes       text check (length(notes) <= 2000),
  created_at  timestamptz not null default now()
);

create index calendar_items_garage_id_starts_on_idx on public.calendar_items (garage_id, starts_on);

alter table public.calendar_items enable row level security;

create policy "garage members" on public.calendar_items
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (private.is_garage_member(garage_id));

-- A subscription link: whoever has the token can read the garage's agenda, so it is long, random,
-- and only visible to the member it belongs to. Making a new one replaces it; deleting it revokes it.
create table public.calendar_feeds (
  id          uuid primary key default gen_random_uuid(),
  garage_id   uuid not null references public.garages (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token       text not null unique check (length(token) >= 32),
  created_at  timestamptz not null default now(),
  unique (garage_id, user_id)
);

alter table public.calendar_feeds enable row level security;

create policy "own feed" on public.calendar_feeds
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_garage_member(garage_id))
  with check (user_id = (select auth.uid()) and private.is_garage_member(garage_id));

-- What the calendar app fetches, without a signed-in user: the events and appointments from half a
-- year back, and the run time and limits of the karts and fitted parts, so the app can plan the
-- maintenance the same way as on the site. Null for an unknown token.
create function public.calendar_feed(feed_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with feed as (
    select f.garage_id from public.calendar_feeds f where f.token = feed_token and length(feed_token) >= 32
  )
  select jsonb_build_object(
    'garage', (select g.name from public.garages g join feed on feed.garage_id = g.id),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'name', e.name, 'type', e.type, 'starts_on', e.starts_on, 'ends_on', e.ends_on,
        'track', jsonb_build_object('name', t.name, 'city', t.city)) order by e.starts_on)
      from public.events e join feed on feed.garage_id = e.garage_id left join public.tracks t on t.id = e.track_id
      where e.starts_on >= current_date - 183), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'starts_on', c.starts_on, 'ends_on', c.ends_on, 'starts_at', c.starts_at, 'notes', c.notes)
        order by c.starts_on)
      from public.calendar_items c join feed on feed.garage_id = c.garage_id
      where coalesce(c.ends_on, c.starts_on) >= current_date - 183), '[]'::jsonb),
    'karts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id, 'name', k.name, 'status', k.status,
        'usage_limit_minutes', k.usage_limit_minutes, 'component_limits', k.component_limits,
        'sessions', coalesce((
          select jsonb_agg(jsonb_build_object('event_id', s.event_id, 'started_at', s.started_at, 'duration_s', s.duration_s))
          from public.sessions s where s.kart_id = k.id), '[]'::jsonb),
        'maintenance_records', coalesce((
          select jsonb_agg(jsonb_build_object('performed_on', m.performed_on, 'resets_usage', m.resets_usage, 'components', m.components))
          from public.maintenance_records m where m.kart_id = k.id), '[]'::jsonb)))
      from public.karts k join feed on feed.garage_id = k.garage_id
      where k.status in ('active', 'spare')), '[]'::jsonb),
    'parts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'category', p.category, 'brand', p.brand, 'model', p.model,
        'usage_limit_minutes', p.usage_limit_minutes, 'component_limits', p.component_limits,
        'kart_id', (select i.kart_id from public.part_installations i where i.part_id = p.id and i.removed_at is null limit 1),
        'sessions', coalesce((
          select jsonb_agg(jsonb_build_object('started_at', s.started_at, 'duration_s', s.duration_s))
          from public.session_parts sp join public.sessions s on s.id = sp.session_id where sp.part_id = p.id), '[]'::jsonb),
        'maintenance_records', coalesce((
          select jsonb_agg(jsonb_build_object('performed_on', m.performed_on, 'resets_usage', m.resets_usage, 'components', m.components))
          from public.maintenance_records m where m.part_id = p.id), '[]'::jsonb)))
      from public.parts p join feed on feed.garage_id = p.garage_id
      where p.status = 'installed'), '[]'::jsonb)
  )
  where exists (select 1 from feed);
$$;

revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
