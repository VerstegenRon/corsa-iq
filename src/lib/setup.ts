// Kart setup fields in one place: the session form, saving, summaries and the setup comparisons all
// read this list, so a new field only needs adding here (and its texts to the dictionaries' setup section). Values live in setups.values (jsonb) at
// `path`; older setups simply lack the newer fields.

import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import type { SetupValues } from "@/lib/karting";

export type SetupGroup = "tyres" | "gearing" | "chassis" | "engine";

/** The setup texts of the dictionary: group names and each field's label, name and column header. */
export type SetupTexts = Dictionary["setup"];

export type SetupField = {
  /** Form field name, and the key of its texts in the dictionary. */
  name: keyof SetupTexts["fields"];
  path: [string] | [string, string];
  /** Where older setups kept this value (one pressure per axle before per-wheel pressures). */
  legacyPath?: [string, string];
  group: SetupGroup;
  unit?: string;
  kind: "decimal" | "integer" | "text";
  placeholder?: string;
};

export const SETUP_GROUPS: SetupGroup[] = ["tyres", "gearing", "chassis", "engine"];

export const SETUP_FIELDS: SetupField[] = [
  { name: "pressure_fl", path: ["tyre_pressure_cold_bar", "fl"], legacyPath: ["tyre_pressure_cold_bar", "front"], group: "tyres", unit: "bar", kind: "decimal", placeholder: "0,62" },
  { name: "pressure_fr", path: ["tyre_pressure_cold_bar", "fr"], legacyPath: ["tyre_pressure_cold_bar", "front"], group: "tyres", unit: "bar", kind: "decimal", placeholder: "0,62" },
  { name: "pressure_rl", path: ["tyre_pressure_cold_bar", "rl"], legacyPath: ["tyre_pressure_cold_bar", "rear"], group: "tyres", unit: "bar", kind: "decimal", placeholder: "0,60" },
  { name: "pressure_rr", path: ["tyre_pressure_cold_bar", "rr"], legacyPath: ["tyre_pressure_cold_bar", "rear"], group: "tyres", unit: "bar", kind: "decimal", placeholder: "0,60" },
  { name: "hot_pressure_fl", path: ["tyre_pressure_hot_bar", "fl"], legacyPath: ["tyre_pressure_hot_bar", "front"], group: "tyres", unit: "bar", kind: "decimal", placeholder: "0,82" },
  { name: "hot_pressure_fr", path: ["tyre_pressure_hot_bar", "fr"], legacyPath: ["tyre_pressure_hot_bar", "front"], group: "tyres", unit: "bar", kind: "decimal", placeholder: "0,82" },
  { name: "hot_pressure_rl", path: ["tyre_pressure_hot_bar", "rl"], legacyPath: ["tyre_pressure_hot_bar", "rear"], group: "tyres", unit: "bar", kind: "decimal", placeholder: "0,80" },
  { name: "hot_pressure_rr", path: ["tyre_pressure_hot_bar", "rr"], legacyPath: ["tyre_pressure_hot_bar", "rear"], group: "tyres", unit: "bar", kind: "decimal", placeholder: "0,80" },
  { name: "front_teeth", path: ["gearing", "front_teeth"], group: "gearing", kind: "integer", placeholder: "12" },
  { name: "rear_teeth", path: ["gearing", "rear_teeth"], group: "gearing", kind: "integer", placeholder: "82" },
  { name: "axle_hardness", path: ["rear_axle", "hardness"], group: "chassis", kind: "text" },
  { name: "rear_track_width_mm", path: ["rear_track_width_mm"], group: "chassis", unit: "mm", kind: "integer", placeholder: "1395" },
  { name: "front_track_width_mm", path: ["front_track_width_mm"], group: "chassis", unit: "mm", kind: "integer", placeholder: "1270" },
  { name: "ride_height_front", path: ["ride_height", "front"], group: "chassis", kind: "text" },
  { name: "ride_height_rear", path: ["ride_height", "rear"], group: "chassis", kind: "text" },
  { name: "caster", path: ["front_end", "caster"], group: "chassis", kind: "text" },
  { name: "camber", path: ["front_end", "camber"], group: "chassis", kind: "text", placeholder: "-1" },
  { name: "front_hub_mm", path: ["hubs", "front_length_mm"], group: "chassis", unit: "mm", kind: "integer", placeholder: "95" },
  { name: "rear_hub_mm", path: ["hubs", "rear_length_mm"], group: "chassis", unit: "mm", kind: "integer", placeholder: "110" },
  { name: "main_jet", path: ["carburettor", "main_jet"], group: "engine", kind: "integer", placeholder: "125" },
  { name: "needle", path: ["carburettor", "needle"], group: "engine", kind: "text", placeholder: "K98 · 2" },
  { name: "low_screw", path: ["carburettor", "low_screw_turns"], group: "engine", kind: "decimal", placeholder: "1,25" },
  { name: "high_screw", path: ["carburettor", "high_screw_turns"], group: "engine", kind: "decimal", placeholder: "1,5" },
  { name: "spark_plug", path: ["engine", "spark_plug"], group: "engine", kind: "text", placeholder: "B10EG" },
];

/** The field's placeholder in the reader's language, for the fields where it is a word. */
export function setupPlaceholder(ts: SetupTexts, field: SetupField): string | undefined {
  return (ts.placeholders as Partial<Record<string, string>>)[field.name] ?? field.placeholder;
}

/** "LV", "RA": the wheel a tyre-pressure field is for. */
export function setupWheel(ts: SetupTexts, field: SetupField): string {
  return ts.corners[field.path[1] as keyof SetupTexts["corners"]];
}

type Value = string | number;

function readPath(values: SetupValues, field: SetupField, [first, second]: [string] | [string, string]): Value | undefined {
  const record = values as Record<string, unknown>;
  const raw = second === undefined ? record[first] : (record[first] as Record<string, unknown> | undefined)?.[second];
  if (field.kind === "text") return typeof raw === "string" && raw !== "" ? raw : undefined;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

export function getSetupValue(values: SetupValues, field: SetupField): Value | undefined {
  const value = readPath(values, field, field.path);
  return value === undefined && field.legacyPath ? readPath(values, field, field.legacyPath) : value;
}

export function setSetupValue(values: SetupValues, field: SetupField, value: Value) {
  const record = values as Record<string, unknown>;
  const [first, second] = field.path;
  if (second === undefined) record[first] = value;
  else record[first] = { ...((record[first] as Record<string, unknown> | undefined) ?? {}), [second]: value };
}

const decimalFormat = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 3, useGrouping: false });
const pressureFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

/** For display: decimals with a comma, as drivers type them. */
export function formatSetupValue(field: SetupField, value: Value | undefined): string {
  if (value === undefined) return "—";
  if (typeof value === "string") return value;
  return (field.unit === "bar" ? pressureFormat : decimalFormat).format(value);
}

/** For the form's default values. */
export function inputSetupValue(field: SetupField, value: Value | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? String(value).replace(".", ",") : value;
}

/** Rear teeth / front teeth, e.g. 82/12 → 6.83. */
export function gearRatio(values: SetupValues): number | null {
  const { front_teeth: front, rear_teeth: rear } = values.gearing ?? {};
  return front && rear ? Math.round((rear / front) * 100) / 100 : null;
}

export type SetupChange = { field: SetupField; from: Value | undefined; to: Value | undefined };

/** Fields whose value differs between two setups, in form order. */
export function diffSetups(from: SetupValues, to: SetupValues): SetupChange[] {
  return SETUP_FIELDS.flatMap((field) => {
    const a = getSetupValue(from, field);
    const b = getSetupValue(to, field);
    return a === b ? [] : [{ field, from: a, to: b }];
  });
}

/** Fields that have a value in at least one of the setups, in form order. */
export function fieldsInUse(setups: SetupValues[]): SetupField[] {
  return SETUP_FIELDS.filter((field) => setups.some((values) => getSetupValue(values, field) !== undefined));
}
