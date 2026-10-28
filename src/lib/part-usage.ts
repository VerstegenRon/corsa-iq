// Run time of a part or kart from the sessions it ran in. Same rule as the part_usage view: a
// session counts towards a counter when it started on a later (UTC) date than the maintenance job.

export type UsageSession = { started_at: string; duration_s: number | null };
export type UsageRecord = { performed_on: string; resets_usage: boolean; components: string[] };

export type Usage = {
  /** Lifetime run time; never resets, whatever was revised or replaced. */
  totalMinutes: number;
  /** Since the last job that reset the counter (a revision, or a major chassis service). */
  sinceResetMinutes: number;
  lastResetOn: string | null;
  /** Per component: last job that covered it, and run time since (or since new when never done). */
  components: Record<string, { lastOn: string | null; minutes: number }>;
};

function minutesAfter(sessions: UsageSession[], date: string | null) {
  const seconds = sessions
    .filter((s) => date === null || s.started_at.slice(0, 10) > date)
    .reduce((sum, s) => sum + (s.duration_s ?? 0), 0);
  return Math.floor(seconds / 60);
}

function latest(dates: string[]) {
  return dates.length === 0 ? null : dates.reduce((a, b) => (a > b ? a : b));
}

export function computeUsage(sessions: UsageSession[], records: UsageRecord[], componentKeys: string[]): Usage {
  const lastResetOn = latest(records.filter((r) => r.resets_usage).map((r) => r.performed_on));
  const components = Object.fromEntries(
    componentKeys.map((key) => {
      const lastOn = latest(records.filter((r) => r.components.includes(key)).map((r) => r.performed_on));
      return [key, { lastOn, minutes: minutesAfter(sessions, lastOn) }];
    }),
  );
  return {
    totalMinutes: minutesAfter(sessions, null),
    sinceResetMinutes: minutesAfter(sessions, lastResetOn),
    lastResetOn,
    components,
  };
}

/** Minutes each component may run before it is due, from the `component_limits` jsonb column. */
export type ComponentLimits = Record<string, number>;

/** Keeps only known components with a positive whole number of minutes. */
export function readLimits(value: unknown, componentKeys: readonly string[]): ComponentLimits {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, minutes]) => componentKeys.includes(key) && Number.isInteger(minutes) && (minutes as number) > 0,
    ),
  ) as ComponentLimits;
}

export type LimitTone = "ok" | "soon" | "due";

/** Share of the limit used: below 90% normal, from 90% warning, at 100% due. */
export function limitState(minutes: number, limit: number | null | undefined) {
  if (!limit) return null;
  const share = minutes / limit;
  const tone: LimitTone = share >= 1 ? "due" : share >= 0.9 ? "soon" : "ok";
  return { share, tone };
}

export type DueCheck = {
  /** null for the whole part or kart, otherwise the component key. */
  component: string | null;
  minutes: number;
  limit: number;
  share: number;
  tone: Exclude<LimitTone, "ok">;
};

/** Every counter at 90% or more of its limit, most urgent first. */
export function dueChecks(usage: Usage, limit: number | null, componentLimits: ComponentLimits): DueCheck[] {
  const counters: [string | null, number, number | null][] = [
    [null, usage.sinceResetMinutes, limit],
    ...Object.entries(componentLimits).map(
      ([key, minutes]): [string, number, number] => [key, usage.components[key]?.minutes ?? usage.totalMinutes, minutes],
    ),
  ];
  const checks: DueCheck[] = [];
  for (const [component, minutes, max] of counters) {
    const state = limitState(minutes, max);
    if (state && state.tone !== "ok") checks.push({ component, minutes, limit: max!, share: state.share, tone: state.tone });
  }
  return checks.sort((a, b) => b.share - a.share);
}
