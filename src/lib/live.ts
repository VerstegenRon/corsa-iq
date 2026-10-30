// Live: a session followed while it is driven. Pure helpers shared by the live board, the pitbord
// and the actions: the lap list, the difference with the reference and the engine ranges.

export type LiveLap = {
  lap_number: number;
  lap_time_ms: number;
  sectors_ms: number[];
  position: number | null;
  gap_to_p1_ms: number | null;
  max_speed_kmh: number | null;
  max_water_temp_c: number | null;
  max_egt_c: number | null;
  max_rpm: number | null;
  is_pit_lap: boolean;
};

export type LiveReference = { lapTimeMs: number; sectorsMs: number[]; label: string } | null;

/** Target ranges for the engine channels; outside them the board warns. */
export const ENGINE_RANGES = {
  max_water_temp_c: { unit: "°C", min: 45, max: 60 },
  max_egt_c: { unit: "°C", min: 560, max: 680 },
  max_rpm: { unit: "rpm", min: 12000, max: 16500 },
} as const;
export type EngineChannel = keyof typeof ENGINE_RANGES;

export function engineStatus(channel: EngineChannel, value: number | null): "ok" | "low" | "high" | null {
  if (value === null) return null;
  const range = ENGINE_RANGES[channel];
  return value > range.max ? "high" : value < range.min ? "low" : "ok";
}

/** Laps that count: no pit laps, nothing far slower than the median (out laps, incidents). */
export function countingLiveLaps(laps: LiveLap[]): LiveLap[] {
  const timed = laps.filter((l) => !l.is_pit_lap);
  if (timed.length === 0) return [];
  const sorted = timed.map((l) => l.lap_time_ms).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return timed.filter((l) => l.lap_time_ms <= median * 1.15);
}

export function summarizeLive(laps: LiveLap[], reference: LiveReference) {
  const sorted = [...laps].sort((a, b) => a.lap_number - b.lap_number);
  const last = sorted.at(-1) ?? null;
  const counting = countingLiveLaps(sorted);
  const best = counting.length ? counting.reduce((a, b) => (b.lap_time_ms < a.lap_time_ms ? b : a)) : null;
  const positioned = [...sorted].reverse().find((l) => l.position !== null) ?? null;
  const engine = Object.fromEntries(
    (Object.keys(ENGINE_RANGES) as EngineChannel[]).map((c) => {
      const values = sorted.map((l) => l[c]).filter((v): v is number => v !== null);
      return [c, values.length ? Math.max(...values) : null];
    }),
  ) as Record<EngineChannel, number | null>;
  return {
    laps: sorted,
    last,
    best,
    /** Last lap minus the reference; negative is ahead. */
    deltaMs: last && reference && !last.is_pit_lap ? last.lap_time_ms - reference.lapTimeMs : null,
    bestDeltaMs: best && reference ? best.lap_time_ms - reference.lapTimeMs : null,
    position: positioned?.position ?? null,
    gapToP1Ms: positioned?.gap_to_p1_ms ?? null,
    engine,
  };
}

/** "1:02,3" while the lap runs; tenths are enough on a moving clock. */
export function formatRunning(ms: number): string {
  const total = Math.max(0, ms);
  const minutes = Math.floor(total / 60_000);
  const seconds = (total % 60_000) / 1000;
  const s = seconds.toFixed(1).replace(".", ",");
  return minutes > 0 ? `${minutes}:${seconds < 10 ? "0" : ""}${s}` : s;
}

/** Reads "+1,234", "1.2" or "-0,5" as milliseconds; null when empty, undefined when not a number. */
export function parseGap(raw: string): number | null | undefined {
  const value = raw.trim().replace(",", ".").replace(/^\+/, "").replace("−", "-");
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) < 600 ? Math.round(n * 1000) : undefined;
}
