-- More outdoor kart circuits in Germany, the Netherlands and Belgium for the official catalogue.
-- Skips names that already exist as official entries.
insert into public.tracks (name, city, country)
select v.name, v.city, v.country
from (values
  ('Landsard', 'Eindhoven', 'NL'),
  ('Kartcircuit Emmen', 'Emmen', 'NL'),
  ('Kartcircuit Lelystad', 'Lelystad', 'NL'),
  ('Karting Spa-Francorchamps', 'Francorchamps', 'BE'),
  ('Kart-Arena Mülsen', 'Mülsen', 'DE'),
  ('Motorsport Arena Oschersleben Kartbahn', 'Oschersleben', 'DE'),
  ('Kartbahn Liedolsheim', 'Dettenheim', 'DE'),
  ('Kartbahn Oppenrod', 'Buseck', 'DE'),
  ('Prokart Raceland Wittgenborn', 'Wächtersbach', 'DE')
) as v(name, city, country)
where not exists (
  select 1 from public.tracks t where t.created_by_garage_id is null and lower(t.name) = lower(v.name)
);
