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

/** Valid laps only: no pit laps, no laps the import marked as invalid. */
export function countingLaps<T extends StoredLap>(laps: T[]): T[] {
  return laps.filter((lap) => lap.is_valid && !lap.is_pit_lap);
}

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return null;
  const avg = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1));
}

export type SectorStat = {
  sector: number;
  bestMs: number;
  averageMs: number;
  /** Average time lost against the best time in this sector: where the lap time goes. */
  lossMs: number;
  spreadMs: number | null;
};

/** Per sector: best, average and the average loss against the best. Empty when laps have different sectors. */
export function analyzeSectors(laps: StoredLap[]): SectorStat[] {
  const valid = countingLaps(laps);
  const sectorCount = valid[0]?.sectors.length ?? 0;
  if (sectorCount === 0 || !valid.every((lap) => lap.sectors.length === sectorCount)) return [];
  return Array.from({ length: sectorCount }, (_, i) => {
    const times = valid.map((lap) => lap.sectors[i]);
    const bestMs = Math.min(...times);
    const averageMs = mean(times);
    const spread = standardDeviation(times);
    return {
      sector: i + 1,
      bestMs,
      averageMs: Math.round(averageMs),
      lossMs: Math.round(averageMs - bestMs),
      spreadMs: spread === null ? null : Math.round(spread),
    };
  });
}

export type Stint = {
  index: number;
  firstLap: number;
  lastLap: number;
  validCount: number;
  bestMs: number | null;
  averageMs: number | null;
  spreadMs: number | null;
  /** Least-squares slope over the valid laps, in ms per lap: positive means the laps got slower. */
  trendMsPerLap: number | null;
};

/**
 * Splits a session into stints at its pit laps. The out lap after a pit stop belongs to the next
 * stint but only counts when the import marked it valid.
 */
export function splitStints(laps: StoredLap[]): Stint[] {
  const groups: StoredLap[][] = [[]];
  for (const lap of laps) {
    if (lap.is_pit_lap) {
      if (groups.at(-1)!.length > 0) groups.push([]);
      continue;
    }
    groups.at(-1)!.push(lap);
  }
  return groups
    .filter((group) => group.length > 0)
    .map((group, index) => {
      const valid = countingLaps(group);
      const times = valid.map((lap) => lap.lap_time_ms);
      const spread = standardDeviation(times);
      let trend: number | null = null;
      if (valid.length >= 3) {
        const xs = valid.map((lap) => lap.lap_number);
        const xMean = mean(xs);
        const yMean = mean(times);
        const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
        trend = denominator === 0 ? null : xs.reduce((sum, x, i) => sum + (x - xMean) * (times[i] - yMean), 0) / denominator;
      }
      return {
        index: index + 1,
        firstLap: group[0].lap_number,
        lastLap: group.at(-1)!.lap_number,
        validCount: valid.length,
        bestMs: times.length > 0 ? Math.min(...times) : null,
        averageMs: times.length > 0 ? Math.round(mean(times)) : null,
        spreadMs: spread === null ? null : Math.round(spread),
        trendMsPerLap: trend === null ? null : Math.round(trend),
      };
    });
}

export type EngineLap = StoredLap & { max_speed_kmh: number | null; max_rpm: number | null };

export type EngineStats = {
  topSpeedKmh: number | null;
  averageTopSpeedKmh: number | null;
  /** Top speed on the fastest lap: a quick check whether the fastest lap was also the fastest down the straight. */
  bestLapSpeedKmh: number | null;
  maxRpm: number | null;
  averageMaxRpm: number | null;
  bestLapRpm: number | null;
};

export function analyzeEngine(laps: EngineLap[]): EngineStats {
  const valid = countingLaps(laps);
  const speeds = valid.map((lap) => lap.max_speed_kmh).filter((v): v is number => v !== null).map(Number);
  const rpms = valid.map((lap) => lap.max_rpm).filter((v): v is number => v !== null);
  const best = valid.length > 0 ? valid.reduce((a, b) => (b.lap_time_ms < a.lap_time_ms ? b : a)) : null;
  return {
    topSpeedKmh: speeds.length > 0 ? Math.max(...speeds) : null,
    averageTopSpeedKmh: speeds.length > 0 ? Math.round(mean(speeds) * 10) / 10 : null,
    bestLapSpeedKmh: best?.max_speed_kmh == null ? null : Number(best.max_speed_kmh),
    maxRpm: rpms.length > 0 ? Math.max(...rpms) : null,
    averageMaxRpm: rpms.length > 0 ? Math.round(mean(rpms)) : null,
    bestLapRpm: best?.max_rpm ?? null,
  };
}

/** 345 → "+0.345", -120 → "-0.120" */
export function formatDelta(ms: number): string {
  const sign = ms < 0 ? "-" : "+";
  return `${sign}${(Math.abs(ms) / 1000).toFixed(3)}`;
}
