// Maintenance planned ahead: for every counter with a limit (an engine or chassis as a whole, or one
// of its components), the first upcoming event after which it would be over its limit, so the job can
// be done before that event. The run time an event will add is what the kart ran at its last events.

import { CHASSIS_COMPONENTS, ENGINE_COMPONENTS, PART_CATEGORIES, labelFor } from "@/lib/karting";
import { computeUsage, readLimits, type UsageRecord } from "@/lib/part-usage";

export type PlanSession = { event_id?: string; started_at: string; duration_s: number | null };

export type PlanKart = {
  id: string;
  name: string;
  status: string;
  usage_limit_minutes: number | null;
  component_limits: unknown;
  sessions: PlanSession[];
  maintenance_records: UsageRecord[];
};

export type PlanPart = {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  usage_limit_minutes: number | null;
  component_limits: unknown;
  /** The kart it is fitted on now. */
  kart_id: string | null;
  sessions: PlanSession[];
  maintenance_records: UsageRecord[];
};

export type PlanEvent = { id: string; name: string; starts_on: string; ends_on: string | null };

/** Used when the garage has no event with run times yet. */
export const DEFAULT_EVENT_MINUTES = 90;
/** How many of a kart's last events its estimate is based on. */
const RECENT_EVENTS = 5;

export type PlannedJob = {
  key: string;
  href: string;
  kind: "kart" | "part";
  /** The kart, or the part ("Rotax Max Evo"). */
  name: string;
  /** The component, e.g. "Zuiger & veren"; null for the whole engine or chassis. */
  componentLabel: string | null;
  minutes: number;
  limit: number;
  /** Run time one event is expected to add. */
  perEventMinutes: number;
  /** True when the estimate is the default, because there are no past events with run times. */
  estimated: boolean;
  /** Already at or over the limit now. */
  dueNow: boolean;
  /** The event to do it before: the first event it would cross the limit at (the next one when due now). */
  event: PlanEvent | null;
  /** How many events from now that is (1 = the next one). */
  eventsUntil: number;
  /** The date to have it done by: the day before that event, or today. */
  dueBy: string;
};

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Minutes a kart ran per event, at its last events before today. */
function minutesPerEvent(kart: PlanKart, today: string): number[] {
  const perEvent = new Map<string, { minutes: number; last: string }>();
  for (const s of kart.sessions) {
    if (!s.event_id || !s.duration_s || s.started_at.slice(0, 10) >= today) continue;
    const entry = perEvent.get(s.event_id) ?? { minutes: 0, last: s.started_at };
    entry.minutes += s.duration_s / 60;
    if (s.started_at > entry.last) entry.last = s.started_at;
    perEvent.set(s.event_id, entry);
  }
  return [...perEvent.values()]
    .sort((a, b) => b.last.localeCompare(a.last))
    .slice(0, RECENT_EVENTS)
    .map((e) => e.minutes);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function planMaintenance({
  karts,
  parts,
  events,
  today,
}: {
  karts: PlanKart[];
  parts: PlanPart[];
  /** Upcoming events, soonest first. */
  events: PlanEvent[];
  today: string;
}): PlannedJob[] {
  const upcoming = events.filter((e) => (e.ends_on ?? e.starts_on) >= today).sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  // Only karts that race; a spare kart and the parts on it are not expected to run.
  const racing = karts.filter((k) => k.status === "active");
  const history = new Map(racing.map((k) => [k.id, minutesPerEvent(k, today)]));
  const all = [...history.values()].flat();
  const fallback = all.length > 0 ? mean(all) : null;
  const estimate = (kartId: string) => {
    const own = history.get(kartId) ?? [];
    if (own.length > 0) return { minutes: mean(own), estimated: false };
    return fallback !== null ? { minutes: fallback, estimated: false } : { minutes: DEFAULT_EVENT_MINUTES, estimated: true };
  };

  type Counter = Omit<PlannedJob, "dueNow" | "event" | "eventsUntil" | "dueBy">;
  const counters: Counter[] = [];

  const engineKeys = Object.keys(ENGINE_COMPONENTS);
  const chassisKeys = Object.keys(CHASSIS_COMPONENTS);

  for (const kart of racing) {
    const usage = computeUsage(kart.sessions, kart.maintenance_records, chassisKeys);
    const { minutes: perEventMinutes, estimated } = estimate(kart.id);
    const base = { kind: "kart" as const, href: `/dashboard/karts/${kart.id}`, name: kart.name, perEventMinutes, estimated };
    if (kart.usage_limit_minutes) {
      counters.push({ ...base, key: `kart-${kart.id}`, componentLabel: null, minutes: usage.sinceResetMinutes, limit: kart.usage_limit_minutes });
    }
    for (const [component, limit] of Object.entries(readLimits(kart.component_limits, chassisKeys))) {
      counters.push({
        ...base,
        key: `kart-${kart.id}-${component}`,
        componentLabel: labelFor(CHASSIS_COMPONENTS, component),
        minutes: usage.components[component]?.minutes ?? usage.totalMinutes,
        limit,
      });
    }
  }

  for (const part of parts) {
    if (!part.kart_id || !history.has(part.kart_id)) continue;
    const keys = part.category === "engine" ? engineKeys : [];
    const usage = computeUsage(part.sessions, part.maintenance_records, keys);
    const { minutes: perEventMinutes, estimated } = estimate(part.kart_id);
    const name = [part.brand, part.model].filter(Boolean).join(" ") || labelFor(PART_CATEGORIES, part.category);
    const base = { kind: "part" as const, href: `/dashboard/parts/${part.id}`, name, perEventMinutes, estimated };
    if (part.usage_limit_minutes) {
      counters.push({ ...base, key: `part-${part.id}`, componentLabel: null, minutes: usage.sinceResetMinutes, limit: part.usage_limit_minutes });
    }
    for (const [component, limit] of Object.entries(readLimits(part.component_limits, keys))) {
      counters.push({
        ...base,
        key: `part-${part.id}-${component}`,
        componentLabel: labelFor(ENGINE_COMPONENTS, component),
        minutes: usage.components[component]?.minutes ?? usage.totalMinutes,
        limit,
      });
    }
  }

  const jobs: PlannedJob[] = [];
  for (const counter of counters) {
    if (counter.minutes >= counter.limit) {
      jobs.push({ ...counter, dueNow: true, event: upcoming[0] ?? null, eventsUntil: upcoming.length > 0 ? 1 : 0, dueBy: today });
      continue;
    }
    let minutes = counter.minutes;
    for (const [index, event] of upcoming.entries()) {
      minutes += counter.perEventMinutes;
      if (minutes < counter.limit) continue;
      const dayBefore = addDays(event.starts_on, -1);
      jobs.push({ ...counter, dueNow: false, event, eventsUntil: index + 1, dueBy: dayBefore < today ? today : dayBefore });
      break;
    }
  }
  return jobs.sort((a, b) => a.dueBy.localeCompare(b.dueBy) || b.minutes / b.limit - a.minutes / a.limit);
}

const hoursFormat = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

/** Minutes as hours, e.g. 552 → "9,2 uur". */
export function formatHours(minutes: number): string {
  return `${hoursFormat.format(Math.round(minutes / 6) / 10)} uur`;
}

export function jobTitle(job: PlannedJob): string {
  return job.componentLabel ? `${job.name} · ${job.componentLabel}` : job.name;
}

/** e.g. "Nu 9,2 van 10 uur. Na Karting Genk (± 1,5 uur) zit je erover." */
export function jobSentence(job: PlannedJob): string {
  const now = `${formatHours(job.minutes)} van ${formatHours(job.limit)}`;
  if (job.dueNow) return `Al ${now}: nu aan de beurt.`;
  const added = formatHours(job.perEventMinutes * job.eventsUntil);
  const after = job.eventsUntil === 1 ? `Na ${job.event!.name}` : `Na ${job.eventsUntil} evenementen, tot en met ${job.event!.name}`;
  return `Nu ${now}. ${after} (± ${added}) zit je erover.`;
}
