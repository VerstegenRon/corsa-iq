// What the app adds to an event's packing list by itself: rain gear when rain is forecast at the
// circuit, a reminder when the homologation of a driver's gear runs out before the event, and the
// maintenance planned before it. Each has a key, so once added it is not suggested again.

import type { ChecklistCategory } from "@/lib/checklist";
import { formatDate } from "@/lib/karting";
import { jobSentence, jobTitle, type PlannedJob } from "@/lib/maintenance-plan";
import { fetchDailyForecast } from "@/lib/weather";

export type Suggestion = {
  key: string;
  title: string;
  category: ChecklistCategory;
  /** Why the app suggests it. */
  reason: string;
  kind: "rain" | "gear" | "maintenance";
};

/** A day counts as wet from this chance of rain, or from this many mm at a lower (but real) chance. */
const RAIN_CHANCE = 50;
const RAIN_MM = 2;
const RAIN_MM_CHANCE = 25;

const dayFormat = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export async function checklistSuggestions({
  event,
  gear,
  jobs,
}: {
  event: { id: string; starts_on: string; ends_on: string | null; latitude: number | null; longitude: number | null };
  gear: { id: string; label: string; valid_until: string }[];
  jobs: PlannedJob[];
}): Promise<Suggestion[]> {
  const last = event.ends_on ?? event.starts_on;
  const suggestions: Suggestion[] = [];

  if (event.latitude !== null && event.longitude !== null) {
    const forecast = await fetchDailyForecast(event.latitude, event.longitude, event.starts_on, last);
    const wet = forecast?.find((d) => {
      const chance = d.precipitation_chance ?? 0;
      return chance >= RAIN_CHANCE || (d.precipitation_mm >= RAIN_MM && chance >= RAIN_MM_CHANCE);
    });
    if (wet) {
      const day = dayFormat.format(new Date(`${wet.date}T12:00:00Z`));
      const mm = String(Math.round(wet.precipitation_mm * 10) / 10).replace(".", ",");
      const reason = `Kans op regen op ${day}: ${wet.precipitation_chance ?? "?"}%, verwacht ${mm} mm.`;
      suggestions.push(
        { key: "rain-tyres", title: "Set regenbanden", category: "tyres", reason, kind: "rain" },
        { key: "rain-suit", title: "Regenpak", category: "driver", reason, kind: "rain" },
      );
    }
  }

  for (const item of gear) {
    if (item.valid_until >= last) continue;
    suggestions.push({
      key: `gear-${item.id}`,
      title: `Geldige vervanging voor: ${item.label}`,
      category: "driver",
      reason: `De homologatie verloopt op ${formatDate(item.valid_until)}, vóór of tijdens dit evenement.`,
      kind: "gear",
    });
  }

  for (const job of jobs) {
    if (job.event?.id !== event.id) continue;
    suggestions.push({
      key: `maintenance-${job.key}`,
      title: `Onderhoud klaar: ${jobTitle(job)}`,
      category: "spares",
      reason: jobSentence(job),
      kind: "maintenance",
    });
  }
  return suggestions;
}
