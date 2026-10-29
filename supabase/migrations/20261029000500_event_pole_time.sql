-- The pole time of an event (the fastest lap of the field in qualifying), for the gap to pole in the
-- season overview. Optional: filled in by the team after the event.
alter table public.events
  add column pole_lap_ms int check (pole_lap_ms > 0);
