-- Town or city of a track, so similar names stay apart ("Karting Genk – Genk (BE)").
alter table public.tracks add column city text;

-- Garages may remove tracks they added themselves; one still used by an event stays (events.track_id).
create policy "delete own tracks" on public.tracks
  for delete to authenticated
  using (created_by_garage_id is not null and private.is_garage_member(created_by_garage_id));

-- Official catalogue: prominent outdoor kart circuits in Europe. Name, town and country only;
-- layouts and lengths are left to be added per track. Skips names that already exist as official entries.
insert into public.tracks (name, city, country)
select v.name, v.city, v.country
from (values
  ('South Garda Karting', 'Lonato del Garda', 'IT'),
  ('Adria Karting Raceway', 'Adria', 'IT'),
  ('Circuito Internazionale Napoli', 'Sarno', 'IT'),
  ('La Conca', 'Muro Leccese', 'IT'),
  ('Franciacorta Karting Track', 'Castrezzato', 'IT'),
  ('7 Laghi Kart', 'Castelletto di Branduzzo', 'IT'),
  ('Circuito Internazionale di Viterbo', 'Viterbo', 'IT'),
  ('Pista Azzurra', 'Jesolo', 'IT'),
  ('Circuito di Siena', 'Castelnuovo Berardenga', 'IT'),
  ('Circuito Il Sagittario', 'Latina', 'IT'),
  ('Karting Genk', 'Genk', 'BE'),
  ('Karting des Fagnes', 'Mariembourg', 'BE'),
  ('Circuit Park Berghem', 'Berghem', 'NL'),
  ('Raceway Venray', 'Venray', 'NL'),
  ('Eurocircuit', 'Valkenswaard', 'NL'),
  ('Prokart Raceland', 'Wackersdorf', 'DE'),
  ('Erftlandring', 'Kerpen', 'DE'),
  ('Schweppermannring', 'Ampfing', 'DE'),
  ('Kartódromo Internacional Lucas Guerrero', 'Chiva', 'ES'),
  ('Circuito Internacional de Zuera', 'Zuera', 'ES'),
  ('Karting Campillos', 'Campillos', 'ES'),
  ('Motorland Aragón Karting', 'Alcañiz', 'ES'),
  ('Kartódromo Internacional do Algarve', 'Portimão', 'PT'),
  ('Kartódromo de Braga', 'Braga', 'PT'),
  ('Circuit International d''Angerville', 'Angerville', 'FR'),
  ('Karting International Alain Prost', 'Le Mans', 'FR'),
  ('Circuit de Salbris', 'Salbris', 'FR'),
  ('Circuit de Varennes-sur-Allier', 'Varennes-sur-Allier', 'FR'),
  ('Circuit d''Aunay-les-Bois', 'Aunay-les-Bois', 'FR'),
  ('PF International', 'Brandon', 'GB'),
  ('Whilton Mill', 'Whilton', 'GB'),
  ('Buckmore Park', 'Chatham', 'GB'),
  ('Rowrah', 'Rowrah', 'GB'),
  ('Clay Pigeon Raceway', 'Dorchester', 'GB'),
  ('Glan-y-Gors', 'Cerrigydrudion', 'GB'),
  ('Larkhall', 'Larkhall', 'GB'),
  ('Powerpark Alahärmä', 'Alahärmä', 'FI'),
  ('Kristianstad Karting', 'Kristianstad', 'SE')
) as v(name, city, country)
where not exists (
  select 1 from public.tracks t where t.created_by_garage_id is null and lower(t.name) = lower(v.name)
);
