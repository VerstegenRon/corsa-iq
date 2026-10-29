// Domain constants mirroring the check constraints in supabase/migrations.

export const PART_CATEGORIES = {
  engine: "Motor",
  carburettor: "Carburateur",
  exhaust: "Uitlaat",
  tyre_set: "Bandenset",
  rim_set: "Velgenset",
  rear_axle: "Achteras",
  sprocket: "Tandwiel",
  chain: "Ketting",
  seat: "Stoel",
  brake_disc: "Remschijf",
  brake_pads: "Remblokken",
  steering_wheel: "Stuur",
  front_hubs: "Voornaven",
  spindle: "Fusee",
  bumper_bodywork: "Bumpers / bodywork",
  data_logger: "Datalogger",
  other: "Overig",
} as const;

export type PartCategory = keyof typeof PART_CATEGORIES;

export const PART_STATUSES = {
  in_stock: "Op voorraad",
  installed: "Gemonteerd",
  worn: "Versleten",
  sold: "Verkocht",
  discarded: "Afgeschreven",
} as const;

export type PartStatus = keyof typeof PART_STATUSES;

export const KART_STATUSES = {
  active: "Actief",
  spare: "Reserve",
  sold: "Verkocht",
  retired: "Uit dienst",
} as const;

export type KartStatus = keyof typeof KART_STATUSES;

/** Driver gear; helmets and suits carry a homologation that runs out. */
export const GEAR_CATEGORIES = {
  helmet: "Helm",
  suit: "Overall",
  gloves: "Handschoenen",
  boots: "Schoenen",
  rib_protector: "Bodyprotector",
  neck_brace: "Nekbescherming",
  rain_suit: "Regenpak",
  other: "Overig",
} as const;

export type GearCategory = keyof typeof GEAR_CATEGORIES;

export const GEAR_STATUSES = {
  in_use: "In gebruik",
  spare: "Reserve",
  retired: "Afgedankt",
} as const;

export function isGearCategory(value: string): value is GearCategory {
  return value in GEAR_CATEGORIES;
}

export const MAINTENANCE_TYPES = {
  revision: "Revisie",
  service: "Onderhoud",
  repair: "Reparatie",
  inspection: "Inspectie",
} as const;

/** Engine components a maintenance job can cover; each keeps its own "hours since" counter. */
export const ENGINE_COMPONENTS = {
  piston: "Zuiger & veren",
  big_end: "Big-end (drijfstanglager)",
  crankshaft: "Krukas",
  main_bearings: "Krukaslagers",
  cylinder: "Cilinder",
  reed_valve: "Membraan / inlaat",
  clutch: "Koppeling",
  gaskets: "Pakkingen & keerringen",
} as const;

/** What a chassis maintenance job can cover; each counts its own run time on the kart. */
export const CHASSIS_COMPONENTS = {
  frame: "Frame (controleren/richten)",
  axle_bearings: "Aslagers",
  wheel_bearings: "Wiellagers voor",
  steering: "Stuurinrichting & fusees",
  brakes: "Remsysteem (ontluchten, vloeistof)",
  fasteners: "Bouten & moeren",
} as const;

export const EVENT_TYPES = {
  training: "Training",
  race: "Race",
  test: "Test",
} as const;

export const SESSION_TYPES = {
  practice: "Vrije training",
  qualifying: "Kwalificatie",
  heat: "Heat",
  prefinal: "Pre-finale",
  final: "Finale",
  test: "Test",
} as const;

export const WEATHER = {
  dry: "Droog",
  damp: "Opdrogend",
  wet: "Nat",
} as const;

export const EXPENSE_CATEGORIES = {
  entry_fee: "Inschrijfgeld",
  tyres: "Banden",
  fuel_oil: "Brandstof & olie",
  parts: "Onderdelen",
  engine_revision: "Motorrevisie",
  track_rental: "Baanhuur",
  travel: "Reiskosten",
  accommodation: "Overnachting",
  licence: "Licentie",
  gear: "Kleding & uitrusting",
  other: "Overig",
} as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export function isPartCategory(value: string): value is PartCategory {
  return value in PART_CATEGORIES;
}

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return value in EXPENSE_CATEGORIES;
}

const collator = new Intl.Collator("nl", { sensitivity: "base", numeric: true });
const regionNames = new Intl.DisplayNames(["nl"], { type: "region" });

/** "IT" → "Italië"; unknown codes stay as they are. */
export function countryName(code: string | null): string {
  if (!code) return "Onbekend land";
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** PostgREST filter for the tracks a garage sees: the official catalogue plus its own entries. */
export function ownOrOfficial(garageId: string): string {
  return `created_by_garage_id.is.null,created_by_garage_id.eq.${garageId}`;
}

/** "South Garda Karting – Lonato del Garda (IT)": the town is always named, also when it is in the name. */
export function trackLabel(track: { name: string; city?: string | null; country?: string | null }): string {
  return `${track.name}${track.city ? ` – ${track.city}` : ""}${track.country ? ` (${track.country})` : ""}`;
}

/** Sorts options A–Z by their label, the way a Dutch reader expects ("Kart 2" before "Kart 10"). */
export function sortByLabel<T extends { label: string }>(options: readonly T[]): T[] {
  return [...options].sort((a, b) => collator.compare(a.label, b.label));
}

/** A label map as [value, label] pairs, A–Z by label, with the catch-all "other" kept last. */
export function sortedEntries(labels: Record<string, string>): [string, string][] {
  return Object.entries(labels).sort(([a, labelA], [b, labelB]) =>
    a === "other" ? 1 : b === "other" ? -1 : collator.compare(labelA, labelB),
  );
}

export function labelFor<T extends Record<string, string>>(labels: T, key: string): string {
  return key in labels ? labels[key as keyof T] : key;
}

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function formatCents(cents: number | null): string {
  return cents === null ? "—" : euro.format(cents / 100);
}

/** 200 → "3 u 20 min" */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} u ${rest} min` : `${rest} min`;
}

/** Value for a decimal input, written like its placeholder: 24995 cents / 100 → "249,95", 500 min / 60 → "8,33". */
export function decimalInput(value: number | null | undefined, divisor: number): string {
  return value === null || value === undefined ? "" : String(Math.round((value / divisor) * 100) / 100).replace(".", ",");
}

/** 52345 → "52.345", 62345 → "1:02.345" */
/** A lap time with a decimal comma, as drivers write it: 48,871 or 1:02,345. */
export function formatLapTime(ms: number | null): string {
  if (ms === null) return "—";
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3);
  return (minutes > 0 ? `${minutes}:${seconds.padStart(6, "0")}` : seconds).replace(".", ",");
}

/** A time difference in seconds with its sign: +0,214 or −0,084 (a real minus sign). */
export function formatGapSeconds(ms: number): string {
  return `${ms < 0 ? "−" : "+"}${(Math.abs(ms) / 1000).toFixed(3).replace(".", ",")}`;
}

/** Run time as hours and minutes the way a mechanic writes it: 4u48, 41u, 0u22. */
export function formatHoursMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 && h >= 10 ? `${h}u` : `${h}u${String(m).padStart(2, "0")}`;
}

/** Accepts "52.345", "52,345" or "1:02.345"; returns milliseconds or null when invalid. */
export function parseLapTime(input: string): number | null {
  const match = input.trim().replace(",", ".").match(/^(?:(\d+):)?(\d{1,2}(?:\.\d{1,3})?)$/);
  if (!match) return null;
  const minutes = match[1] ? Number(match[1]) : 0;
  const seconds = Number(match[2]);
  if (match[1] && seconds >= 60) return null;
  const ms = Math.round((minutes * 60 + seconds) * 1000);
  return ms > 0 ? ms : null;
}

const dateFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(value: string | null): string {
  return value ? dateFormat.format(new Date(value)) : "—";
}

const timeFormat = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export function formatTime(value: string): string {
  return timeFormat.format(new Date(value));
}

/** An ISO timestamp as "YYYY-MM-DDTHH:mm" in Dutch time, for datetime-local inputs. */
export function toLocalDateTimeInput(value: string): string {
  return new Date(value).toLocaleString("sv-SE", { timeZone: "Europe/Amsterdam" }).slice(0, 16).replace(" ", "T");
}

/** Today's date as YYYY-MM-DD in Dutch time, for date inputs and defaults. */
export function todayInAmsterdam(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

/**
 * Setup snapshot stored in setups.values (jsonb). All fields optional: drivers fill in what they track.
 * Field names follow docs/datamodel.md.
 */
type TyrePressures = { fl?: number; fr?: number; rl?: number; rr?: number; front?: number; rear?: number };

/** A setup snapshot (setups.values). The fields are described in lib/setup.ts. */
export type SetupValues = {
  /** Per wheel (fl, fr, rl, rr); older setups have one value per axle (front, rear). */
  tyre_pressure_cold_bar?: TyrePressures;
  tyre_pressure_hot_bar?: TyrePressures;
  gearing?: { front_teeth?: number; rear_teeth?: number };
  rear_axle?: { hardness?: string };
  rear_track_width_mm?: number;
  front_track_width_mm?: number;
  ride_height?: { front?: string; rear?: string };
  front_end?: { caster?: string; camber?: string };
  hubs?: { front_length_mm?: number; rear_length_mm?: number };
  carburettor?: { main_jet?: number; needle?: string; low_screw_turns?: number; high_screw_turns?: number };
  engine?: { spark_plug?: string };
  notes?: string;
};

const pressureFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

export function summarizeSetup(values: SetupValues): string[] {
  const parts: string[] = [];
  const { tyre_pressure_cold_bar: p, tyre_pressure_hot_bar: hot, gearing: g } = values;
  const bar = (value: number | undefined) => (value === undefined ? "–" : pressureFormat.format(value));
  // LV RV / LA RA; an older setup's axle value counts for both wheels.
  const wheels = (q: TyrePressures | undefined) => {
    if (!q) return null;
    const v = [q.fl ?? q.front, q.fr ?? q.front, q.rl ?? q.rear, q.rr ?? q.rear];
    return v.every((x) => x === undefined) ? null : `${bar(v[0])} ${bar(v[1])} / ${bar(v[2])} ${bar(v[3])} bar`;
  };
  const cold = wheels(p);
  const warm = wheels(hot);
  if (cold) parts.push(`Druk ${cold}`);
  if (warm) parts.push(`warm ${warm}`);
  if (g?.front_teeth || g?.rear_teeth) parts.push(`Gearing ${g.front_teeth ?? "–"}/${g.rear_teeth ?? "–"}`);
  if (values.rear_axle?.hardness) parts.push(`As ${values.rear_axle.hardness}`);
  if (values.rear_track_width_mm) parts.push(`Achter ${values.rear_track_width_mm} mm`);
  if (values.front_track_width_mm) parts.push(`Voor ${values.front_track_width_mm} mm`);
  if (values.carburettor?.main_jet) parts.push(`Sproeier ${values.carburettor.main_jet}`);
  return parts;
}
