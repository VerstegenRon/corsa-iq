// What the app adds to an event's packing list by itself: rain gear when rain is forecast at the
// circuit, a reminder when the homologation of a driver's gear runs out before the event, and the
// maintenance planned before it. Each has a key, so once added it is not suggested again.

import type { ChecklistCategory } from "@/lib/checklist";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format } from "@/lib/i18n/locales";
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

/** Titles and reasons are in the reader's language; an added suggestion keeps the title it was added with. */
export async function checklistSuggestions(
  t: Dictionary,
  locale: string,
  {
  event,
  gear,
  jobs,
}: {
  event: { id: string; starts_on: string; ends_on: string | null; latitude: number | null; longitude: number | null };
  gear: { id: string; label: string; valid_until: string }[];
  jobs: PlannedJob[];
  },
): Promise<Suggestion[]> {
  const te = t.events;
  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
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
      const rounded = String(Math.round(wet.precipitation_mm * 10) / 10);
      const mm = locale === "en" ? rounded : rounded.replace(".", ",");
      const reason = format(te.rainReason, { day, chance: wet.precipitation_chance ?? "?", mm });
      suggestions.push(
        { key: "rain-tyres", title: t.checklist.defaultItems.wets, category: "tyres", reason, kind: "rain" },
        { key: "rain-suit", title: t.checklist.defaultItems.rainSuit, category: "driver", reason, kind: "rain" },
      );
    }
  }

  for (const item of gear) {
    if (item.valid_until >= last) continue;
    suggestions.push({
      key: `gear-${item.id}`,
      title: format(te.gearTitle, { item: item.label }),
      category: "driver",
      reason: format(te.gearReason, { date: formatDate(item.valid_until, locale) }),
      kind: "gear",
    });
  }

  for (const job of jobs) {
    if (job.event?.id !== event.id) continue;
    suggestions.push({
      key: `maintenance-${job.key}`,
      title: format(te.maintenanceTitle, { job: jobTitle(job) }),
      category: "spares",
      reason: jobSentence(job),
      kind: "maintenance",
    });
  }
  return suggestions;
}
