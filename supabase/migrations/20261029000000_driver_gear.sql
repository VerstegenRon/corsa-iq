-- Driver gear: helmets, suits, gloves and the like, per driver, with their homologation and the date it
-- runs out. A purchase price is also booked as an expense (category "gear"), like parts.

create table public.gear_items (
  id                    uuid primary key default gen_random_uuid(),
  garage_id             uuid not null references public.garages (id) on delete cascade,
  driver_id             uuid references public.drivers (id) on delete set null,
  category              text not null check (category in (
                          'helmet', 'suit', 'gloves', 'boots', 'rib_protector', 'neck_brace', 'rain_suit', 'other')),
  brand                 text,
  model                 text,
  size                  text,
  homologation          text,
  valid_until           date,
  status                text not null default 'in_use' check (status in ('in_use', 'spare', 'retired')),
  purchased_on          date,
  purchase_price_cents  int check (purchase_price_cents >= 0),
  notes                 text,
  created_at            timestamptz not null default now()
);

create index gear_items_garage_id_idx on public.gear_items (garage_id);
create index gear_items_driver_id_idx on public.gear_items (driver_id);

alter table public.gear_items enable row level security;

-- Members of the garage, and only with a driver from that same garage.
create policy "garage members" on public.gear_items
  for all to authenticated
  using (private.is_garage_member(garage_id))
  with check (
    private.is_garage_member(garage_id)
    and (driver_id is null or exists (
      select 1 from public.drivers d where d.id = driver_id and d.garage_id = gear_items.garage_id))
  );

-- The purchase expense of a gear item, kept in line with its price (see gear-actions.ts).
alter table public.expenses
  add column gear_item_id uuid references public.gear_items (id) on delete set null;

create index expenses_gear_item_id_idx on public.expenses (gear_item_id);
