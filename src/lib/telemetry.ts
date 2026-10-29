// Logger telemetry in the distance domain: parsing a sample-level export (AiM, Alfano, Unipro, MyChron
// or any CSV with time and speed), resampling every lap on fixed distance steps, and the comparison of
// two laps for Analyse ("Waar zit de tijd?"). Pure, so the import preview, the server and the page agree.

import { detectDelimiter, detectSource, splitLine, type LapSource } from "@/lib/lap-import";

/** Distance step of the stored channel files. */
export const SAMPLE_M = 2.5;

export const CHANNELS = {
  speed: { label: "Snelheid", unit: "km/u", digits: 1 },
  rpm: { label: "Toeren", unit: "rpm", digits: 0 },
  lat_g: { label: "G-kracht", unit: "g", digits: 2 },
  lon_g: { label: "G-kracht lengte", unit: "g", digits: 2 },
  lat: { label: "Breedtegraad", unit: "°", digits: 6 },
  lng: { label: "Lengtegraad", unit: "°", digits: 6 },
} as const;
export type Channel = keyof typeof CHANNELS;
/** The channels a driver can pick on the big chart. */
export const CHART_CHANNELS: Channel[] = ["speed", "rpm", "lat_g"];

/** One lap as stored in the telemetry bucket. */
export type TelemetryFile = {
  v: 1;
  sample_m: number;
  length_m: number;
  lap_time_ms: number;
  channels: Partial<Record<Channel, number[]>>;
};

export type TelemetryLap = {
  lap_number: number;
  lap_time_ms: number;
  is_valid: boolean;
  max_speed_kmh: number | null;
  max_rpm: number | null;
  file: TelemetryFile;
};

export type ParsedTelemetry = { source: LapSource; channels: Channel[]; laps: TelemetryLap[]; samples: number };

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const norm = (header: string) =>
  header
    .toLowerCase()
    .replace(/^"|"$/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/[_\s]+/g, " ")
    .trim();

const COLUMN_PATTERNS: [keyof Columns, RegExp][] = [
  ["time", /^(time|tijd|zeit|temps|t|elapsed time|session time)$/],
  ["distance", /^(gps )?(distance|afstand|dist|distanz)$/],
  ["speed", /^(gps )?(speed|snelheid|vitesse|geschwindigkeit|v)$|speed$/],
  ["rpm", /^(rpm|toeren|engine rpm|drehzahl|engine)$/],
  ["lat_g", /^(gps )?(latacc|lat acc|lateral acc|lateral g|lat g|g lat|acc lat)/],
  ["lon_g", /^(gps )?(lonacc|lon acc|longitudinal acc|long acc|inline acc|lon g|g lon|acc lon)/],
  ["lat", /^(gps )?latitude$|^lat$/],
  ["lng", /^(gps )?longitude$|^(lon|lng)$/],
  ["lap", /^(lap|ronde|lap ?nr\.?|lap ?number|lap ?#|runde|tour)$/],
];
type Columns = { time: number; distance: number; speed: number; rpm: number; lat_g: number; lon_g: number; lat: number; lng: number; lap: number };

const num = (cell: string | undefined) => {
  if (cell === undefined) return NaN;
  const value = cell.trim().replace(/^"|"$/g, "").replace(",", ".");
  return value === "" ? NaN : Number(value);
};

/** "Beacon Markers" in an AiM export: the session time (s) at the end of each lap. */
function beaconMarkers(lines: string[], delimiter: string | null): number[] {
  const line = lines.find((l) => /^"?beacon markers"?/i.test(l.trim()));
  if (!line) return [];
  return splitLine(line, delimiter)
    .slice(1)
    .map(num)
    .filter((n) => Number.isFinite(n) && n > 0);
}

type Sample = { t: number; d: number | null; values: Partial<Record<Channel, number>>; lap: number | null };

/**
 * Reads a sample-level export. Laps come from a lap column, else from the beacon markers, else from the
 * distance channel starting over. Each lap is resampled every SAMPLE_M metres from its own start.
 */
export function parseTelemetry(text: string, fileName?: string): ParsedTelemetry | { error: string } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const delimiter = detectDelimiter(lines.filter((l) => l.trim() !== "").slice(-200));
  if (delimiter === null) return { error: "Dit lijkt geen telemetriebestand: er zijn geen kolommen gevonden." };

  const headerIndex = lines.findIndex((line) => {
    const cells = splitLine(line, delimiter).map(norm);
    return cells.some((c) => /^(time|tijd|zeit|temps|t)$/.test(c)) && cells.some((c) => /speed|snelheid|vitesse|distance|afstand/.test(c));
  });
  if (headerIndex < 0) return { error: "Geen kolommen voor tijd en snelheid gevonden. Exporteer met de kanalen Time, Distance en Speed." };

  const headers = splitLine(lines[headerIndex], delimiter).map(norm);
  const columns: Partial<Columns> = {};
  for (const [key, pattern] of COLUMN_PATTERNS) {
    const index = headers.findIndex((h, i) => pattern.test(h) && !Object.values(columns).includes(i));
    if (index >= 0) columns[key] = index;
  }
  if (columns.time === undefined) return { error: "Geen tijdkolom gevonden." };
  if (columns.speed === undefined) return { error: "Geen snelheidskanaal gevonden. Exporteer ook de snelheid (GPS Speed)." };

  const samples: Sample[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.trim() === "") continue;
    const cells = splitLine(line, delimiter);
    const t = num(cells[columns.time]);
    const speed = num(cells[columns.speed]);
    if (!Number.isFinite(t) || !Number.isFinite(speed)) continue; // the units row, footers
    const values: Partial<Record<Channel, number>> = { speed };
    for (const channel of ["rpm", "lat_g", "lon_g", "lat", "lng"] as const) {
      const index = columns[channel];
      const value = index === undefined ? NaN : num(cells[index]);
      if (Number.isFinite(value)) values[channel] = value;
    }
    const d = columns.distance === undefined ? NaN : num(cells[columns.distance]);
    const lap = columns.lap === undefined ? NaN : num(cells[columns.lap]);
    samples.push({ t, d: Number.isFinite(d) ? d : null, values, lap: Number.isFinite(lap) ? lap : null });
  }
  if (samples.length < 20) return { error: "Te weinig meetpunten in het bestand." };

  // ---- Split into laps.
  const groups: Sample[][] = [];
  // Where a lap ends, when the export says so exactly (beacon markers).
  let markerEnds: number[] = [];
  if (samples.every((s) => s.lap !== null)) {
    for (const s of samples) {
      const last = groups.at(-1);
      if (last && last[0].lap === s.lap) last.push(s);
      else groups.push([s]);
    }
  } else {
    const markers = beaconMarkers(lines.slice(0, headerIndex), delimiter);
    if (markers.length > 0) {
      markerEnds = markers;
      let current: Sample[] = [];
      let next = 0;
      for (const s of samples) {
        while (next < markers.length && s.t >= markers[next]) {
          groups.push(current);
          current = [];
          next++;
        }
        current.push(s);
      }
      groups.push(current);
    } else {
      // The distance channel starts over at the line.
      let current: Sample[] = [];
      for (const s of samples) {
        const prev = current.at(-1);
        if (prev && prev.d !== null && s.d !== null && s.d < prev.d * 0.5 && prev.d > 100) {
          groups.push(current);
          current = [];
        }
        current.push(s);
      }
      groups.push(current);
    }
  }

  const channels = (Object.keys(CHANNELS) as Channel[]).filter((c) => samples.some((s) => s.values[c] !== undefined));
  const laps: TelemetryLap[] = [];
  let previousEnd: number | null = null;
  groups.forEach((group, i) => {
    const start = previousEnd ?? group[0]?.t ?? 0;
    const end = markerEnds[i] ?? group.at(-1)?.t ?? start;
    previousEnd = end;
    if (group.length < 10) return;
    const file = resampleLap(group, channels, Math.round((end - start) * 1000));
    if (!file) return;
    const speeds = file.channels.speed ?? [];
    laps.push({
      lap_number: group[0].lap ?? i + 1,
      lap_time_ms: file.lap_time_ms,
      is_valid: true,
      max_speed_kmh: speeds.length ? Math.round(Math.max(...speeds) * 100) / 100 : null,
      max_rpm: file.channels.rpm?.length ? Math.round(Math.max(...file.channels.rpm)) : null,
      file,
    });
  });
  if (laps.length === 0) return { error: "Er zijn geen volledige ronden gevonden." };

  // Out laps, in laps and slow laps: well above the median of the session.
  const sorted = laps.map((l) => l.lap_time_ms).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  for (const lap of laps) lap.is_valid = lap.lap_time_ms <= median * 1.15 && lap.lap_time_ms >= median * 0.85;

  return { source: detectSource(text, fileName), channels, laps, samples: samples.length };
}

function resampleLap(group: Sample[], channels: Channel[], lapTimeMs: number): TelemetryFile | null {
  // Distance from the lap's own start: the logger's channel, else speed integrated over time.
  const dist: number[] = [];
  if (group.every((s) => s.d !== null)) {
    const d0 = group[0].d!;
    for (const s of group) dist.push(s.d! - d0);
  } else {
    let d = 0;
    group.forEach((s, i) => {
      if (i > 0) d += (((group[i - 1].values.speed ?? 0) + (s.values.speed ?? 0)) / 2 / 3.6) * (s.t - group[i - 1].t);
      dist.push(d);
    });
  }
  const length = dist.at(-1)!;
  if (!(length > 50) || lapTimeMs <= 0) return null;

  const n = Math.floor(length / SAMPLE_M) + 1;
  const out: Partial<Record<Channel, number[]>> = {};
  for (const channel of channels) {
    if (!group.some((s) => s.values[channel] !== undefined)) continue;
    const factor = 10 ** CHANNELS[channel].digits;
    const values: number[] = [];
    let j = 0;
    for (let i = 0; i < n; i++) {
      const x = i * SAMPLE_M;
      while (j < dist.length - 2 && dist[j + 1] < x) j++;
      const a = group[j].values[channel] ?? group[j + 1]?.values[channel] ?? 0;
      const b = group[j + 1]?.values[channel] ?? a;
      const span = dist[j + 1] - dist[j];
      const f = span > 0 ? Math.min(1, Math.max(0, (x - dist[j]) / span)) : 0;
      values.push(Math.round((a + (b - a) * f) * factor) / factor);
    }
    out[channel] = values;
  }
  return { v: 1, sample_m: SAMPLE_M, length_m: Math.round(length * 10) / 10, lap_time_ms: lapTimeMs, channels: out };
}

/** Checks a channel file read back from storage. */
export function isTelemetryFile(value: unknown): value is TelemetryFile {
  const file = value as TelemetryFile;
  return (
    typeof file === "object" &&
    file !== null &&
    file.v === 1 &&
    typeof file.sample_m === "number" &&
    typeof file.length_m === "number" &&
    typeof file.lap_time_ms === "number" &&
    Array.isArray(file.channels?.speed)
  );
}

// ---------------------------------------------------------------------------
// Comparing two laps
// ---------------------------------------------------------------------------

/** A channel of the reference on the grid of your lap; the reference is stretched to your lap length. */
function onGrid(values: number[], n: number): number[] {
  if (values.length === n) return values;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * (values.length - 1);
    const j = Math.min(values.length - 2, Math.floor(x));
    out.push(values[j] + (values[j + 1] - values[j]) * (x - j));
  }
  return out;
}

/** cum_t[i] = Σ ds / v, scaled so the last point is the measured lap time (seconds). */
function cumulativeTime(speed: number[], ds: number, lapTimeMs: number): number[] {
  const cum = [0];
  for (let i = 1; i < speed.length; i++) {
    const v = Math.max(1, (speed[i - 1] + speed[i]) / 2 / 3.6);
    cum.push(cum[i - 1] + ds / v);
  }
  const scale = lapTimeMs / 1000 / cum.at(-1)!;
  return cum.map((t) => t * scale);
}

export type Corner = { number: number; name: string; apex_m: number; start_m: number; end_m: number };

export type CornerResult = Corner & {
  /** Seconds lost in this corner's segment; negative is a gain. */
  lossS: number;
  /** Your braking point minus the reference's, in metres; negative is braking earlier. */
  brakeDiffM: number;
  apexYouKmh: number;
  apexRefKmh: number;
};

export type LapComparison = {
  sampleM: number;
  lengthM: number;
  you: Partial<Record<Channel, number[]>>;
  ref: Partial<Record<Channel, number[]>>;
  /** Running time difference you − ref in seconds; above zero is slower. */
  delta: number[];
};

export function compareLaps(you: TelemetryFile, ref: TelemetryFile): LapComparison {
  const n = you.channels.speed!.length;
  const ds = you.sample_m;
  const refChannels: Partial<Record<Channel, number[]>> = {};
  for (const [channel, values] of Object.entries(ref.channels) as [Channel, number[]][]) refChannels[channel] = onGrid(values, n);
  const refDs = (ref.length_m / you.length_m) * ds;
  const cumYou = cumulativeTime(you.channels.speed!, ds, you.lap_time_ms);
  const cumRef = cumulativeTime(refChannels.speed!, refDs, ref.lap_time_ms);
  return {
    sampleM: ds,
    lengthM: (n - 1) * ds,
    you: you.channels,
    ref: refChannels,
    delta: cumYou.map((t, i) => Math.round((t - cumRef[i]) * 10000) / 10000),
  };
}

function smooth(values: number[], window = 3) {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window), i + window + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/**
 * Corners from a lap's speed: local minima that drop and rise again by at least `minDrop` km/h,
 * at least 40 m apart. Segment boundaries lie halfway between consecutive apexes.
 */
export function detectCorners(speed: number[], sampleM: number, minDrop = 6): Corner[] {
  const v = smooth(speed);
  const apexes: number[] = [];
  let peak = v[0];
  let candidate: number | null = null;
  for (let i = 1; i < v.length; i++) {
    if (candidate === null) {
      if (v[i] > peak) peak = v[i];
      else if (peak - v[i] >= minDrop) candidate = i;
    } else if (v[i] < v[candidate]) {
      candidate = i;
    } else if (v[i] - v[candidate] >= minDrop) {
      apexes.push(candidate);
      candidate = null;
      peak = v[i];
    }
  }
  if (candidate !== null && v.at(-1)! - v[candidate] >= minDrop / 2) apexes.push(candidate);

  const merged: number[] = [];
  for (const i of apexes) {
    const last = merged.at(-1);
    if (last !== undefined && (i - last) * sampleM < 40) {
      if (v[i] < v[last]) merged[merged.length - 1] = i;
    } else merged.push(i);
  }
  return withSegments(merged.map((i) => i * sampleM), (v.length - 1) * sampleM);
}

export function withSegments(apexes: number[], lengthM: number, names: (string | null)[] = []): Corner[] {
  return apexes.map((apex, k) => ({
    number: k + 1,
    name: names[k] || `T${k + 1}`,
    apex_m: Math.round(apex * 10) / 10,
    start_m: k === 0 ? 0 : Math.round(((apexes[k - 1] + apex) / 2) * 10) / 10,
    end_m: k === apexes.length - 1 ? lengthM : Math.round(((apex + apexes[k + 1]) / 2) * 10) / 10,
  }));
}

/** The braking point: the last local speed maximum before the apex, walking back while speed rises. */
function brakePoint(speed: number[], from: number, apex: number): number {
  let i = apex;
  while (i > from && speed[i - 1] >= speed[i] - 0.2) i--;
  return i;
}

export function cornerResults(comparison: LapComparison, corners: Corner[]): CornerResult[] {
  const { delta, sampleM } = comparison;
  // Smoothed over ~17 m, so logger noise on a straight is not taken for a braking point.
  const you = smooth(comparison.you.speed!);
  const ref = smooth(comparison.ref.speed!);
  const rawYou = smooth(comparison.you.speed!, 1);
  const rawRef = smooth(comparison.ref.speed!, 1);
  const at = (m: number) => Math.min(delta.length - 1, Math.max(0, Math.round(m / sampleM)));
  return corners.map((corner) => {
    const [s, a, e] = [at(corner.start_m), at(corner.apex_m), at(corner.end_m)];
    // The apex of each lap within the segment, so a corner taken a little later still lines up.
    const window = (values: number[]) => {
      const from = Math.max(s, a - Math.round(30 / sampleM));
      const to = Math.min(e, a + Math.round(30 / sampleM));
      let min = from;
      for (let i = from; i <= to; i++) if (values[i] < values[min]) min = i;
      return min;
    };
    const apexYou = window(you);
    const apexRef = window(ref);
    return {
      ...corner,
      lossS: Math.round((delta[e] - delta[s]) * 1000) / 1000,
      brakeDiffM: Math.round((brakePoint(you, s, apexYou) - brakePoint(ref, s, apexRef)) * sampleM),
      apexYouKmh: Math.round(rawYou[apexYou] * 10) / 10,
      apexRefKmh: Math.round(rawRef[apexRef] * 10) / 10,
    };
  });
}

/** "Eén ding voor Q2": the corner that costs most, and what to change there. */
export function oneThing(results: CornerResult[]): { corner: CornerResult; advice: string } | null {
  const worst = [...results].sort((a, b) => b.lossS - a.lossS)[0];
  if (!worst || worst.lossS <= 0.005) return null;
  const apexDiff = Math.round((worst.apexRefKmh - worst.apexYouKmh) * 10) / 10;
  const advice =
    worst.brakeDiffM <= -3
      ? `${worst.name}: ${-worst.brakeDiffM} m later remmen`
      : worst.brakeDiffM >= 3
        ? `${worst.name}: ${worst.brakeDiffM} m eerder remmen`
        : apexDiff >= 1
          ? `${worst.name}: ${String(apexDiff).replace(".", ",")} km/u meer bochtsnelheid`
          : `${worst.name}: eerder op het gas uit de bocht`;
  return { corner: worst, advice };
}
