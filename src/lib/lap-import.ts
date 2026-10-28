// Turns a lap-time export (CSV/TSV from a data logger, a timing sheet, or pasted text) into laps.
// Pure functions without browser or server dependencies, so the preview and the server agree.
//
// Logger exports differ per brand and software version, so nothing here depends on one exact format:
// the delimiter, header row and columns are detected, and the driver can correct the column choice.

import { parseLapTime } from "@/lib/karting";

export type LapSource = "aim" | "alfano" | "unipro" | "csv" | "manual";

export type LapTable = { headers: string[]; rows: string[][]; hasHeader: boolean };

export type ColumnMapping = {
  lapTime: number;
  lapNumber: number | null;
  sectors: number[];
  maxSpeed: number | null;
  maxRpm: number | null;
};

export type ImportedLap = {
  lap_number: number;
  lap_time_ms: number;
  is_valid: boolean;
  is_pit_lap: boolean;
  max_speed_kmh: number | null;
  max_rpm: number | null;
  sectors_ms: number[];
};

/** A lap slower than this share of the median is most likely an out lap, pit lap or incident. */
export const OUTLIER_FACTOR = 1.15;

const MIN_LAP_MS = 5_000;
const MAX_LAP_MS = 30 * 60_000;

export function detectSource(text: string, fileName?: string): LapSource {
  const sample = `${fileName ?? ""}\n${text.slice(0, 4000)}`;
  if (/\baim\b|race ?studio|mychron/i.test(sample)) return "aim";
  if (/alfano/i.test(sample)) return "alfano";
  if (/unipro|unigo|laptimer ?6/i.test(sample)) return "unipro";
  return fileName ? "csv" : "manual";
}

/** Accepts 52.345, 52,345, 1:02.345, 1:02:345, whole seconds or milliseconds; null when it is not a lap time. */
export function parseTimeCell(raw: string): number | null {
  const value = raw.trim().replace(/^"|"$/g, "").trim();
  if (value === "") return null;

  let ms: number | null = null;
  const colonMillis = value.match(/^(\d{1,2}):(\d{2}):(\d{3})$/);
  if (colonMillis) {
    ms = Number(colonMillis[1]) * 60_000 + Number(colonMillis[2]) * 1000 + Number(colonMillis[3]);
  } else if (/^\d+$/.test(value)) {
    const n = Number(value);
    ms = n < 600 ? n * 1000 : n >= 10_000 ? n : null;
  } else {
    ms = parseLapTime(value);
  }
  return ms !== null && ms >= MIN_LAP_MS && ms <= MAX_LAP_MS ? ms : null;
}

/** Sector times are shorter than a lap, so they get their own, looser check. */
function parseSectorCell(raw: string): number | null {
  const value = raw.trim().replace(/^"|"$/g, "").replace(",", ".");
  const match = value.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const ms = Math.round(((match[1] ? Number(match[1]) * 60 : 0) + Number(match[2])) * 1000);
  return ms > 0 && ms <= MAX_LAP_MS ? ms : null;
}

function parseNumberCell(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = Number(raw.trim().replace(/^"|"$/g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function splitLine(line: string, delimiter: string | null): string[] {
  if (delimiter === null) return [line.trim()];
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function detectDelimiter(lines: string[]): string | null {
  const sample = lines.slice(0, 60);
  // Pasted lap times with a decimal comma ("52,345") are one column, not two.
  if (sample.every((line) => /^\s*(\d+:)?\d+,\d{1,3}\s*$/.test(line))) return null;

  let best: { delimiter: string | null; score: number } = { delimiter: null, score: 0 };
  for (const delimiter of ["\t", ";", ","]) {
    const counts = sample.map((line) => splitLine(line, delimiter).length - 1).filter((n) => n > 0);
    if (counts.length === 0) continue;
    const frequency = new Map<number, number>();
    for (const n of counts) frequency.set(n, (frequency.get(n) ?? 0) + 1);
    const [, mostCommon] = [...frequency.entries()].sort((a, b) => b[1] - a[1])[0];
    // Rows that agree on a column count matter more than many delimiters in a few header lines.
    if (mostCommon > best.score) best = { delimiter, score: mostCommon };
  }
  return best.delimiter;
}

const normalize = (header: string) =>
  header
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/[_\s]+/g, " ")
    .trim();

const LAP_TIME_HEADERS = /^(lap ?time|lap ?times|time|tijd|rondetijd|zeit|rundenzeit|temps|temps au tour|temps tour|tempo|best)$/;
const LAP_NUMBER_HEADERS = /^(lap|laps|lap ?#|lap ?nr\.?|lap ?no\.?|lap ?number|ronde|ronde ?nr\.?|runde|tour|#|nr\.?|no\.?)$/;
const SECTOR_HEADER = /^(s|sec|sector|sektor|secteur|split|int|intermediate|tussentijd|t)\s*[-.]?\s*(\d{1,2})$/;
const SPEED_HEADER = /(max|top).*(speed|snelheid|geschw|vitesse)|(speed|snelheid|vitesse).*max|^v ?max$/;
const RPM_HEADER = /rpm|toeren|drehzahl|tr\/min/;

function isHeaderRow(cells: string[]) {
  return cells.some((cell) => {
    const name = normalize(cell);
    return name.includes("lap time") || name.includes("laptime") || LAP_TIME_HEADERS.test(name) || LAP_NUMBER_HEADERS.test(name);
  });
}

export function parseLapTable(text: string): LapTable {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  const delimiter = detectDelimiter(lines);
  const rows = lines.map((line) => splitLine(line, delimiter));

  // Logger exports often start with metadata (driver, track, date); the header is the first row that names
  // a lap or time column and is followed by a row containing a lap time.
  const headerIndex = rows.findIndex(
    (cells, i) => i < 60 && isHeaderRow(cells) && (rows[i + 1] ?? []).some((cell) => parseTimeCell(cell) !== null),
  );
  if (headerIndex === -1) {
    const width = Math.max(1, ...rows.map((cells) => cells.length));
    return { headers: Array.from({ length: width }, (_, i) => `Kolom ${i + 1}`), rows, hasHeader: false };
  }

  const headers = rows[headerIndex].map((cell, i) => cell || `Kolom ${i + 1}`);
  const dataRows = rows.slice(headerIndex + 1).filter((cells) => cells.length >= Math.min(2, headers.length));
  return { headers, rows: dataRows, hasHeader: true };
}

function parseRate(table: LapTable, column: number, parse: (raw: string) => number | null) {
  if (table.rows.length === 0) return 0;
  return table.rows.filter((row) => parse(row[column] ?? "") !== null).length / table.rows.length;
}

export function guessMapping(table: LapTable): ColumnMapping {
  const names = table.headers.map(normalize);
  const find = (test: (name: string) => boolean) => {
    const index = names.findIndex(test);
    return index === -1 ? null : index;
  };

  let lapTime = table.hasHeader
    ? find((name) => name.includes("lap time") || name.includes("laptime") || name.includes("rondetijd") || name.includes("rundenzeit")) ??
      find((name) => LAP_TIME_HEADERS.test(name))
    : null;
  if (lapTime === null || parseRate(table, lapTime, parseTimeCell) < 0.5) {
    // No usable header: take the column where most cells read as a lap time.
    const rates = table.headers.map((_, i) => parseRate(table, i, parseTimeCell));
    lapTime = rates.indexOf(Math.max(...rates));
  }

  const lapNumber = table.hasHeader
    ? find((name) => LAP_NUMBER_HEADERS.test(name))
    : null;

  const sectors = names
    .map((name, index) => ({ index, match: name.match(SECTOR_HEADER) }))
    .filter((s): s is { index: number; match: RegExpMatchArray } => s.match !== null && s.index !== lapTime)
    .sort((a, b) => Number(a.match[2]) - Number(b.match[2]))
    .map((s) => s.index);

  return {
    lapTime,
    lapNumber: lapNumber !== null && lapNumber !== lapTime ? lapNumber : null,
    sectors,
    maxSpeed: table.hasHeader ? find((name) => SPEED_HEADER.test(name)) : null,
    maxRpm: table.hasHeader ? find((name) => RPM_HEADER.test(name)) : null,
  };
}

/** Sector columns are either split times per sector or running times since the lap started. */
function toSectorTimes(values: number[], lapMs: number): number[] {
  const isRunning = values.every((v, i) => i === 0 || v > values[i - 1]) && Math.abs(values.at(-1)! - lapMs) <= 50;
  const sum = values.reduce((a, b) => a + b, 0);
  if (isRunning && sum > lapMs * 1.2) return values.map((v, i) => (i === 0 ? v : v - values[i - 1]));
  return values;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function buildLaps(table: LapTable, mapping: ColumnMapping): ImportedLap[] {
  const laps: ImportedLap[] = [];
  for (const row of table.rows) {
    const lapMs = parseTimeCell(row[mapping.lapTime] ?? "");
    if (lapMs === null) continue;

    const sectorValues = mapping.sectors.map((i) => parseSectorCell(row[i] ?? ""));
    const sectors = sectorValues.every((v): v is number => v !== null) ? toSectorTimes(sectorValues, lapMs) : [];
    // Lap 0 is a common name for the out lap, so zero is a valid lap number here.
    const lapNumberCell = mapping.lapNumber === null ? "" : (row[mapping.lapNumber] ?? "").replace(/"/g, "").trim();
    const lapNumber = /^\d+$/.test(lapNumberCell) ? Number(lapNumberCell) : null;
    const rpm = mapping.maxRpm === null ? null : parseNumberCell(row[mapping.maxRpm]);

    laps.push({
      lap_number: lapNumber ?? laps.length + 1,
      lap_time_ms: lapMs,
      is_valid: true,
      is_pit_lap: false,
      max_speed_kmh: mapping.maxSpeed === null ? null : parseNumberCell(row[mapping.maxSpeed]),
      max_rpm: rpm === null ? null : Math.round(rpm),
      sectors_ms: sectors,
    });
  }

  // Lap numbers must be unique per session; when the file's numbering is unusable, count from 1.
  if (new Set(laps.map((lap) => lap.lap_number)).size !== laps.length) {
    laps.forEach((lap, i) => (lap.lap_number = i + 1));
  }

  if (laps.length >= 3) {
    const limit = median(laps.map((lap) => lap.lap_time_ms)) * OUTLIER_FACTOR;
    for (const lap of laps) if (lap.lap_time_ms > limit) lap.is_valid = false;
  }
  return laps;
}

/** Server-side check of laps sent by the browser. */
export function validateLaps(input: unknown): ImportedLap[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 500) return null;
  const laps: ImportedLap[] = [];
  for (const item of input) {
    if (typeof item !== "object" || item === null) return null;
    const lap = item as Record<string, unknown>;
    const isPositiveInt = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v > 0;
    if (!Number.isInteger(lap.lap_number) || (lap.lap_number as number) < 0) return null;
    if (!isPositiveInt(lap.lap_time_ms) || (lap.lap_time_ms as number) > MAX_LAP_MS) return null;
    if (!Array.isArray(lap.sectors_ms) || lap.sectors_ms.length > 20 || !lap.sectors_ms.every(isPositiveInt)) return null;
    const speed = typeof lap.max_speed_kmh === "number" && lap.max_speed_kmh > 0 && lap.max_speed_kmh < 1000 ? lap.max_speed_kmh : null;
    const rpm = isPositiveInt(lap.max_rpm) && (lap.max_rpm as number) < 100_000 ? (lap.max_rpm as number) : null;
    laps.push({
      lap_number: lap.lap_number as number,
      lap_time_ms: lap.lap_time_ms as number,
      is_valid: lap.is_valid !== false,
      is_pit_lap: lap.is_pit_lap === true,
      max_speed_kmh: speed,
      max_rpm: rpm,
      sectors_ms: lap.sectors_ms as number[],
    });
  }
  return new Set(laps.map((lap) => lap.lap_number)).size === laps.length ? laps : null;
}
