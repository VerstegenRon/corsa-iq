// Kart setup fields in one place: the session form, saving, summaries and the setup comparisons all
// read this list, so a new field only needs adding here. Values live in setups.values (jsonb) at
// `path`; older setups simply lack the newer fields.

import type { SetupValues } from "@/lib/karting";

export type SetupGroup = "tyres" | "gearing" | "chassis" | "engine";

export type SetupField = {
  /** Form field name. */
  name: string;
  path: [string] | [string, string];
  /** Where older setups kept this value (one pressure per axle before per-wheel pressures). */
  legacyPath?: [string, string];
  group: SetupGroup;
  label: string;
  /** Column header and diff label. */
  short: string;
  unit?: string;
  kind: "decimal" | "integer" | "text";
  placeholder?: string;
};

export const SETUP_GROUPS: Record<SetupGroup, string> = {
  tyres: "Banden",
  gearing: "Overbrenging",
  chassis: "Chassis",
  engine: "Motor & carburateur",
};

export const SETUP_FIELDS: SetupField[] = [
  { name: "pressure_fl", path: ["tyre_pressure_cold_bar", "fl"], legacyPath: ["tyre_pressure_cold_bar", "front"], group: "tyres", label: "Linksvoor, koud (bar)", short: "LV koud", unit: "bar", kind: "decimal", placeholder: "0,62" },
  { name: "pressure_fr", path: ["tyre_pressure_cold_bar", "fr"], legacyPath: ["tyre_pressure_cold_bar", "front"], group: "tyres", label: "Rechtsvoor, koud (bar)", short: "RV koud", unit: "bar", kind: "decimal", placeholder: "0,62" },
  { name: "pressure_rl", path: ["tyre_pressure_cold_bar", "rl"], legacyPath: ["tyre_pressure_cold_bar", "rear"], group: "tyres", label: "Linksachter, koud (bar)", short: "LA koud", unit: "bar", kind: "decimal", placeholder: "0,60" },
  { name: "pressure_rr", path: ["tyre_pressure_cold_bar", "rr"], legacyPath: ["tyre_pressure_cold_bar", "rear"], group: "tyres", label: "Rechtsachter, koud (bar)", short: "RA koud", unit: "bar", kind: "decimal", placeholder: "0,60" },
  { name: "hot_pressure_fl", path: ["tyre_pressure_hot_bar", "fl"], legacyPath: ["tyre_pressure_hot_bar", "front"], group: "tyres", label: "Linksvoor, warm (bar)", short: "LV warm", unit: "bar", kind: "decimal", placeholder: "0,82" },
  { name: "hot_pressure_fr", path: ["tyre_pressure_hot_bar", "fr"], legacyPath: ["tyre_pressure_hot_bar", "front"], group: "tyres", label: "Rechtsvoor, warm (bar)", short: "RV warm", unit: "bar", kind: "decimal", placeholder: "0,82" },
  { name: "hot_pressure_rl", path: ["tyre_pressure_hot_bar", "rl"], legacyPath: ["tyre_pressure_hot_bar", "rear"], group: "tyres", label: "Linksachter, warm (bar)", short: "LA warm", unit: "bar", kind: "decimal", placeholder: "0,80" },
  { name: "hot_pressure_rr", path: ["tyre_pressure_hot_bar", "rr"], legacyPath: ["tyre_pressure_hot_bar", "rear"], group: "tyres", label: "Rechtsachter, warm (bar)", short: "RA warm", unit: "bar", kind: "decimal", placeholder: "0,80" },
  { name: "front_teeth", path: ["gearing", "front_teeth"], group: "gearing", label: "Tandwiel voor (tanden)", short: "Tandw. v", kind: "integer", placeholder: "12" },
  { name: "rear_teeth", path: ["gearing", "rear_teeth"], group: "gearing", label: "Tandwiel achter (tanden)", short: "Tandw. a", kind: "integer", placeholder: "82" },
  { name: "axle_hardness", path: ["rear_axle", "hardness"], group: "chassis", label: "Achteras (hardheid)", short: "As", kind: "text", placeholder: "medium" },
  { name: "rear_track_width_mm", path: ["rear_track_width_mm"], group: "chassis", label: "Spoorbreedte achter (mm)", short: "Spoor a", unit: "mm", kind: "integer", placeholder: "1395" },
  { name: "front_track_width_mm", path: ["front_track_width_mm"], group: "chassis", label: "Spoorbreedte voor (mm)", short: "Spoor v", unit: "mm", kind: "integer", placeholder: "1270" },
  { name: "ride_height_front", path: ["ride_height", "front"], group: "chassis", label: "Rijhoogte voor", short: "Hoogte v", kind: "text", placeholder: "midden" },
  { name: "ride_height_rear", path: ["ride_height", "rear"], group: "chassis", label: "Rijhoogte achter", short: "Hoogte a", kind: "text", placeholder: "laag" },
  { name: "caster", path: ["front_end", "caster"], group: "chassis", label: "Caster", short: "Caster", kind: "text", placeholder: "neutraal" },
  { name: "camber", path: ["front_end", "camber"], group: "chassis", label: "Camber", short: "Camber", kind: "text", placeholder: "-1" },
  { name: "front_hub_mm", path: ["hubs", "front_length_mm"], group: "chassis", label: "Naaflengte voor (mm)", short: "Naaf v", unit: "mm", kind: "integer", placeholder: "95" },
  { name: "rear_hub_mm", path: ["hubs", "rear_length_mm"], group: "chassis", label: "Naaflengte achter (mm)", short: "Naaf a", unit: "mm", kind: "integer", placeholder: "110" },
  { name: "main_jet", path: ["carburettor", "main_jet"], group: "engine", label: "Hoofdsproeier", short: "Sproeier", kind: "integer", placeholder: "125" },
  { name: "needle", path: ["carburettor", "needle"], group: "engine", label: "Naald (en clip)", short: "Naald", kind: "text", placeholder: "K98 · 2" },
  { name: "low_screw", path: ["carburettor", "low_screw_turns"], group: "engine", label: "Stelschroef laag (slagen)", short: "Laag", kind: "decimal", placeholder: "1,25" },
  { name: "high_screw", path: ["carburettor", "high_screw_turns"], group: "engine", label: "Stelschroef hoog (slagen)", short: "Hoog", kind: "decimal", placeholder: "1,5" },
  { name: "spark_plug", path: ["engine", "spark_plug"], group: "engine", label: "Bougie", short: "Bougie", kind: "text", placeholder: "B10EG" },
];

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
