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

export function isPartCategory(value: string): value is PartCategory {
  return value in PART_CATEGORIES;
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

const dateFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(value: string | null): string {
  return value ? dateFormat.format(new Date(value)) : "—";
}
