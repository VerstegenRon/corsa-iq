-- Demo data from the "Niets aan het lot" design, for trying out the season overview, the material
-- life bars and the setup tree. Everything is named "TEST", so it can be removed again in one go.
--
-- Replace __GARAGE_ID__ and __DRIVER_ID__ with a garage and one of its drivers, then run it once.
-- Remove: delete the TEST events, parts, kart, season and the setups none of their sessions use.

do $$
declare
  g uuid := '__GARAGE_ID__';
  drv uuid := '__DRIVER_ID__';
  season uuid;
  kart uuid;
  motor1 uuid; motor2 uuid; tyres uuid; pads uuid; chain uuid;
  ev record;
  e uuid;
  euro uuid;
  s uuid;
  v1 uuid := gen_random_uuid(); v2 uuid := gen_random_uuid(); v3 uuid := gen_random_uuid(); v4 uuid := gen_random_uuid();
  v5 uuid := gen_random_uuid(); v6 uuid := gen_random_uuid(); v7 uuid := gen_random_uuid();
  base jsonb := '{"gearing": {"front_teeth": 11, "rear_teeth": 80}, "tyre_pressure_cold_bar": {"fl": 0.55, "fr": 0.55, "rl": 0.62, "rr": 0.62}, "rear_axle": {"hardness": "medium"}, "front_track_width_mm": 1270, "hubs": {"rear_length_mm": 110}, "carburettor": {"main_jet": 128}}';
  n int := 0;
begin
  insert into seasons (garage_id, name, year, budget_cents) values (g, 'TEST Seizoen 2026', 2026, 1200000) returning id into season;
  insert into karts (garage_id, name, class, usage_limit_minutes) values (g, 'TEST Kart A', 'KZ2', 3600) returning id into kart;

  insert into parts (garage_id, category, brand, model, status, usage_limit_minutes) values (g, 'engine', 'TEST', 'Motor 01', 'installed', 360) returning id into motor1;
  insert into parts (garage_id, category, brand, model, status, usage_limit_minutes) values (g, 'engine', 'TEST', 'Motor 02', 'in_stock', 360) returning id into motor2;
  insert into parts (garage_id, category, brand, model, status, usage_limit_minutes) values (g, 'tyre_set', 'TEST', 'Bandenset C', 'installed', 90) returning id into tyres;
  insert into parts (garage_id, category, brand, model, status, usage_limit_minutes) values (g, 'brake_pads', 'TEST', 'Remblokken achter', 'installed', 200) returning id into pads;
  insert into parts (garage_id, category, brand, model, status, usage_limit_minutes) values (g, 'chain', 'TEST', 'Ketting', 'installed', 300) returning id into chain;
  insert into part_installations (part_id, kart_id, installed_at)
  select p, kart, '2026-03-01' from unnest(array[motor1, tyres, pads, chain]) p;

  -- The season: name, circuit, day, type, best lap of the team, result, pole time.
  for ev in
    select * from (values
      (1, 'TEST Race Genk', 'Karting Genk', date '2026-03-14', 'race', 52514, 4, 52300),
      (2, 'TEST Race Kerpen', 'Erftlandring', date '2026-04-04', 'race', 50861, 2, 50800),
      (3, 'TEST Race Lonato', 'South Garda Karting', date '2026-04-25', 'race', 55488, 7, 55100),
      (4, 'TEST Race Wackersdorf', 'Prokart Raceland', date '2026-05-16', 'race', 51640, 3, 51500),
      (5, 'TEST Test Franciacorta', 'Franciacorta Karting Track', date '2026-06-06', 'test', 50120, null, null),
      (6, 'TEST Race Adria', 'Adria Karting Raceway', date '2026-06-27', 'race', 50951, 5, 50700),
      (7, 'TEST Race Le Mans', 'Karting International Alain Prost', date '2026-09-12', 'race', 53344, 2, 53300),
      (8, 'TEST Race Eurocircuit', 'Eurocircuit', date '2026-10-03', 'race', 48903, 1, 48903),
      (9, 'TEST Training Venray', 'Raceway Venray', date '2026-11-07', 'training', null, null, null)
    ) as x(nr, name, track, day, type, best, pos, pole)
  loop
    insert into events (garage_id, season_id, track_id, name, type, starts_on, result_position, pole_lap_ms)
    values (g, season, (select id from tracks where name = ev.track and created_by_garage_id is null), ev.name, ev.type, ev.day, ev.pos, ev.pole)
    returning id into e;
    if ev.nr = 8 then euro := e; end if;
    -- Four sessions of 18 minutes at every event driven, except Eurocircuit (its setup chain is below).
    if ev.best is not null and ev.nr <> 8 then
      for i in 1..4 loop
        insert into sessions (event_id, kart_id, driver_id, type, started_at, duration_s, best_lap_ms, conditions)
        values (e, kart, drv, (array['practice', 'practice', 'qualifying', 'final'])[i], (ev.day + time '08:00' + i * interval '2 hours')::timestamp at time zone 'Europe/Amsterdam',
          1080, ev.best + (array[620, 310, 120, 0])[i], '{"weather": "dry"}')
        returning id into s;
        insert into session_parts (session_id, part_id) values (s, chain), (s, pads);
        if ev.nr >= 5 then insert into session_parts (session_id, part_id) values (s, motor1); end if;
        if ev.nr <= 2 then insert into session_parts (session_id, part_id) values (s, motor2); end if;
      end loop;
    end if;
  end loop;

  -- The setup tree at Eurocircuit: v1 → v2 → v3 → v5 → v7 is the fast line, v4 a dead end off v2,
  -- v6 a wet branch off v1. Created one after the other, so they number v1 to v7.
  insert into setups (id, garage_id, parent_setup_id, "values", created_at) values
    (v1, g, null, base, '2026-10-03 07:00+02'),
    (v2, g, v1, jsonb_set(base, '{rear_axle,hardness}', '"hard"'), '2026-10-03 08:00+02'),
    (v3, g, v2, jsonb_set(jsonb_set(base, '{rear_axle,hardness}', '"hard"'), '{front_track_width_mm}', '1272'), '2026-10-03 09:00+02'),
    (v4, g, v2, jsonb_set(jsonb_set(base, '{rear_axle,hardness}', '"hard"'), '{hubs,rear_length_mm}', '115'), '2026-10-03 10:00+02'),
    (v5, g, v3, jsonb_set(jsonb_set(jsonb_set(jsonb_set(base, '{rear_axle,hardness}', '"hard"'), '{front_track_width_mm}', '1272'), '{tyre_pressure_cold_bar,rl}', '0.58'), '{tyre_pressure_cold_bar,rr}', '0.58'), '2026-10-03 11:00+02'),
    (v6, g, v1, jsonb_set(jsonb_set(jsonb_set(base, '{tyre_pressure_cold_bar}', '{"fl": 0.75, "fr": 0.75, "rl": 0.75, "rr": 0.75}'), '{front_track_width_mm}', '1280'), '{rear_axle,hardness}', '"zacht"'), '2026-10-03 12:00+02'),
    (v7, g, v5, jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(base, '{rear_axle,hardness}', '"hard"'), '{front_track_width_mm}', '1272'), '{tyre_pressure_cold_bar,rl}', '0.58'), '{tyre_pressure_cold_bar,rr}', '0.58'), '{gearing,rear_teeth}', '81'), '2026-10-03 13:00+02');

  for ev in
    select * from (values
      (v1, 'practice', time '09:00', 49612, 'dry'),
      (v2, 'practice', time '10:00', 49284, 'dry'),
      (v4, 'practice', time '11:00', 49390, 'dry'),
      (v3, 'practice', time '12:00', 49105, 'dry'),
      (v6, 'practice', time '13:00', 56210, 'wet'),
      (v5, 'qualifying', time '15:00', 48903, 'dry'),
      (v7, 'test', time '17:30', null, 'dry')
    ) as x(setup, type, at, best, weather)
  loop
    insert into sessions (event_id, kart_id, driver_id, setup_id, type, started_at, duration_s, best_lap_ms, conditions)
    values (euro, kart, drv, ev.setup, ev.type, ('2026-10-03'::date + ev.at)::timestamp at time zone 'Europe/Amsterdam', 1080, ev.best, jsonb_build_object('weather', ev.weather))
    returning id into s;
    insert into session_parts (session_id, part_id) values (s, motor1), (s, chain), (s, pads);
    n := n + 1;
    if n >= 6 then insert into session_parts (session_id, part_id) values (s, tyres); end if;
  end loop;
end $$;
