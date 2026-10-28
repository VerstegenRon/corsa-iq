// Session statistics from stored laps. Only valid laps (no out/in laps, no outliers) count.

export type StoredLap = {
  lap_number: number;
  lap_time_ms: number;
  is_valid: boolean;
  is_pit_lap: boolean;
  sectors: number[];
};

export type LapSummary = {
  bestMs: number | null;
  bestLapNumber: number | null;
  averageMs: number | null;
  /** Standard deviation of valid laps: lower is more consistent. */
  spreadMs: number | null;
  /** Sum of the best time in each sector, when every valid lap has the same sectors. */
  theoreticalBestMs: number | null;
  bestSectors: number[];
  validCount: number;
};

export function summarizeLaps(laps: StoredLap[]): LapSummary {
  const valid = laps.filter((lap) => lap.is_valid && !lap.is_pit_lap);
  const times = valid.map((lap) => lap.lap_time_ms);
  if (times.length === 0) {
    return { bestMs: null, bestLapNumber: null, averageMs: null, spreadMs: null, theoreticalBestMs: null, bestSectors: [], validCount: 0 };
  }

  const bestMs = Math.min(...times);
  const averageMs = times.reduce((a, b) => a + b, 0) / times.length;
  const spreadMs =
    times.length > 1 ? Math.sqrt(times.reduce((sum, t) => sum + (t - averageMs) ** 2, 0) / (times.length - 1)) : null;

  const sectorCount = valid[0].sectors.length;
  const sameSectors = sectorCount > 0 && valid.every((lap) => lap.sectors.length === sectorCount);
  const bestSectors = sameSectors
    ? Array.from({ length: sectorCount }, (_, i) => Math.min(...valid.map((lap) => lap.sectors[i])))
    : [];

  return {
    bestMs,
    bestLapNumber: valid.find((lap) => lap.lap_time_ms === bestMs)!.lap_number,
    averageMs: Math.round(averageMs),
    spreadMs: spreadMs === null ? null : Math.round(spreadMs),
    theoreticalBestMs: bestSectors.length > 0 ? bestSectors.reduce((a, b) => a + b, 0) : null,
    bestSectors,
    validCount: valid.length,
  };
}

/** 345 → "+0.345", -120 → "-0.120" */
export function formatDelta(ms: number): string {
  const sign = ms < 0 ? "-" : "+";
  return `${sign}${(Math.abs(ms) / 1000).toFixed(3)}`;
}
