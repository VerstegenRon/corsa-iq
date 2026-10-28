-- Which engine components a maintenance job covered (e.g. a new piston, or a big-end rebuild).
-- The part's total run time never resets; per component the app shows the time since it was last
-- worked on, and `resets_usage` still resets the "since last revision" counter of the part itself.
alter table public.maintenance_records
  add column components text[] not null default '{}'
    check (components <@ array[
      'piston', 'big_end', 'crankshaft', 'main_bearings', 'cylinder', 'reed_valve', 'clutch', 'gaskets'
    ]::text[]);
