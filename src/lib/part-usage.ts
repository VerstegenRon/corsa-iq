// Run time of a part from the sessions it ran in. Same rule as the part_usage view: a session
// counts towards a counter when it started on a later (UTC) date than the maintenance job.

export type UsageSession = { started_at: string; duration_s: number | null };
export type UsageRecord = { performed_on: string; resets_usage: boolean; components: string[] };

export type PartUsage = {
  /** Lifetime run time; never resets, whatever was revised or replaced. */
  totalMinutes: number;
  /** Since the last job that reset the counter (a revision). */
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

export function computePartUsage(sessions: UsageSession[], records: UsageRecord[], componentKeys: string[]): PartUsage {
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
