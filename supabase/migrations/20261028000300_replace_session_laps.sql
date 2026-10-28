-- Replaces all laps (and sectors) of a session in one transaction and refreshes its best lap.
-- Runs as the caller (security invoker), so the regular RLS policies decide what may be written.
--
-- p_laps: [{ "lap_number": 1, "lap_time_ms": 52345, "is_valid": true, "is_pit_lap": false,
--            "max_speed_kmh": 98.4, "max_rpm": 15200, "sectors_ms": [17012, 18211, 17122] }, ...]
create function public.replace_session_laps(p_session_id uuid, p_data_import_id uuid, p_laps jsonb)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  lap_count int;
begin
  if not exists (select 1 from public.sessions where id = p_session_id) then
    raise exception 'session not found' using errcode = 'P0002';
  end if;

  delete from public.laps where session_id = p_session_id;

  insert into public.laps (session_id, lap_number, lap_time_ms, is_valid, is_pit_lap, max_speed_kmh, max_rpm)
  select p_session_id, l.lap_number, l.lap_time_ms, coalesce(l.is_valid, true), coalesce(l.is_pit_lap, false),
         l.max_speed_kmh, l.max_rpm
  from jsonb_to_recordset(p_laps) as l(
    lap_number int, lap_time_ms int, is_valid boolean, is_pit_lap boolean, max_speed_kmh numeric, max_rpm int);

  -- Separate statement: the sector RLS check must be able to see the laps inserted above.
  insert into public.lap_sectors (lap_id, sector_number, sector_time_ms)
  select laps.id, s.ordinality::int, (s.value)::int
  from jsonb_to_recordset(p_laps) as l(lap_number int, sectors_ms jsonb)
  join public.laps on laps.session_id = p_session_id and laps.lap_number = l.lap_number
  cross join lateral jsonb_array_elements_text(coalesce(l.sectors_ms, '[]'::jsonb)) with ordinality as s(value, ordinality);

  select count(*) into lap_count from public.laps where session_id = p_session_id;

  update public.sessions
  set best_lap_ms = (select min(lap_time_ms) from public.laps
                     where session_id = p_session_id and is_valid and not is_pit_lap),
      data_import_id = coalesce(p_data_import_id, data_import_id)
  where id = p_session_id;

  return lap_count;
end;
$$;

revoke execute on function public.replace_session_laps(uuid, uuid, jsonb) from public, anon;
grant execute on function public.replace_session_laps(uuid, uuid, jsonb) to authenticated;
