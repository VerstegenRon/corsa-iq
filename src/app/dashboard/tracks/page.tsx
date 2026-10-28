import type { Metadata } from "next";

import { AddSection } from "@/components/edit-section";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { countryName, ownOrOfficial, sortByLabel } from "@/lib/karting";

import { TrackForm } from "./track-form";
import { TrackList, type TrackRow } from "./track-list";

export const metadata: Metadata = {
  title: "Circuits — CorsaIQ",
};

export default async function TracksPage() {
  const { supabase, garage } = await getCurrentGarage();

  const [tracksResult, eventsResult] = await Promise.all([
    supabase.from("tracks").select("id, name, city, country, created_by_garage_id").or(ownOrOfficial(garage.id)),
    supabase.from("events").select("track_id").eq("garage_id", garage.id),
  ]);
  if (tracksResult.error) throw new Error(tracksResult.error.message);

  const eventsPerTrack = new Map<string, number>();
  for (const e of eventsResult.data ?? []) eventsPerTrack.set(e.track_id, (eventsPerTrack.get(e.track_id) ?? 0) + 1);

  const rows: TrackRow[] = tracksResult.data.map((t) => ({
      id: t.id,
      name: t.name,
      city: t.city,
      country: t.country,
      countryName: countryName(t.country),
      own: t.created_by_garage_id === garage.id,
      events: eventsPerTrack.get(t.id) ?? 0,
    }));
  // Countries A–Z, tracks A–Z within each country.
  const sorted = sortByLabel(rows.map((r) => ({ ...r, label: `${r.countryName}\u0000${r.name}` })));

  return (
    <>
      <PageHeader icon="flag" title="Circuits" subtitle={`${rows.length} circuits in Europa · mis je er een? Voeg het toe.`} add="Circuit" />

      <section aria-label="Alle circuits" className={cardClass}>
        <TrackList tracks={sorted} />
      </section>

      <AddSection title="Circuit toevoegen">
        <TrackForm />
      </AddSection>
    </>
  );
}
