// Homologation of driver gear: helmets and suits are only allowed until their homologation runs out.

/** Warn this many days before the homologation runs out. */
export const GEAR_WARNING_DAYS = 60;

export type GearValidity = { tone: "ok" | "soon" | "expired"; daysLeft: number } | null;

/** `validUntil` and `today` as YYYY-MM-DD; the item is still valid on its last day. */
export function gearValidity(validUntil: string | null, today: string): GearValidity {
  if (!validUntil) return null;
  const daysLeft = Math.round((Date.parse(validUntil) - Date.parse(today)) / 86_400_000);
  return { tone: daysLeft < 0 ? "expired" : daysLeft <= GEAR_WARNING_DAYS ? "soon" : "ok", daysLeft };
}

/** Common homologations, offered as suggestions; any text is allowed. */
export const HOMOLOGATION_SUGGESTIONS = [
  "Snell K2020",
  "Snell SA2020",
  "Snell CMR2016",
  "FIA 8859-2015",
  "CIK-FIA Level 2",
  "CIK-FIA Level 1",
];
