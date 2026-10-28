-- Per-component limits and chassis maintenance.
-- component_limits maps a component key to the minutes it may run before it is due again, e.g.
-- {"piston": 600}; the app validates the keys. Karts get the same limits as parts, measured over the
-- sessions they ran in, and their maintenance jobs can cover chassis components.
alter table public.parts
  add column component_limits jsonb not null default '{}'::jsonb
    check (jsonb_typeof(component_limits) = 'object');

alter table public.karts
  add column usage_limit_minutes int check (usage_limit_minutes > 0),
  add column component_limits jsonb not null default '{}'::jsonb
    check (jsonb_typeof(component_limits) = 'object');

alter table public.maintenance_records
  drop constraint maintenance_records_components_check,
  add constraint maintenance_records_components_check check (components <@ array[
    'piston', 'big_end', 'crankshaft', 'main_bearings', 'cylinder', 'reed_valve', 'clutch', 'gaskets',
    'frame', 'axle_bearings', 'wheel_bearings', 'steering', 'brakes', 'fasteners'
  ]::text[]);
