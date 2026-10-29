-- Packing list: the garage's fixed list, set up once, and per event a copy to tick off, plus extra
-- items for that event (some suggested by the app, such as rain tyres when rain is forecast).

create table public.checklist_items (
  id          uuid primary key default gen_random_uuid(),
  garage_id   uuid not null references public.garages (id) on delete cascade,
  title       text not null check (length(title) between 1 and 120),
  category    text not null check (category in ('tools', 'tyres', 'fuel', 'spares', 'driver', 'papers', 'other')),
  created_at  timestamptz not null default now()
);

create index checklist_items_garage_id_idx on public.checklist_items (garage_id);

alter table public.checklist_items enable row level security;

create policy "garage members" on public.checklist_items
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (private.is_garage_member(garage_id));

create table public.event_checklist_items (
  id                uuid primary key default gen_random_uuid(),
  garage_id         uuid not null references public.garages (id) on delete cascade,
  event_id          uuid not null references public.events (id) on delete cascade,
  -- Where the item came from: the fixed list, or one of the app's suggestions; neither for an extra.
  template_item_id  uuid references public.checklist_items (id) on delete set null,
  suggestion_key    text check (length(suggestion_key) <= 120),
  title             text not null check (length(title) between 1 and 120),
  category          text not null check (category in ('tools', 'tyres', 'fuel', 'spares', 'driver', 'papers', 'other')),
  checked           boolean not null default false,
  checked_at        timestamptz,
  created_at        timestamptz not null default now(),
  unique (event_id, template_item_id),
  unique (event_id, suggestion_key)
);

create index event_checklist_items_event_id_idx on public.event_checklist_items (event_id);
create index event_checklist_items_garage_id_idx on public.event_checklist_items (garage_id);
create index event_checklist_items_template_item_id_idx on public.event_checklist_items (template_item_id);

alter table public.event_checklist_items enable row level security;

-- Members of the garage, and only for an event of that same garage.
create policy "garage members" on public.event_checklist_items
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (
    private.is_garage_member(garage_id)
    and exists (select 1 from public.events e where e.id = event_id and e.garage_id = event_checklist_items.garage_id)
  );
