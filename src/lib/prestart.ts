// The pre-start checklist ("Klaar voor Q1?"): the four cold tyre pressures against the setup, the
// drivetrain checks, engine hours and the setup lock. Pure, so the page and the actions agree.

import { format } from "@/lib/i18n/locales";
import { SETUP_FIELDS, type SetupField } from "@/lib/setup";

export type CheckStatus = "ok" | "warn" | "fail" | "open";

/** ok = |measured − target| ≤ tolerance. */
export const TYRE_TOLERANCE_BAR = 0.02;
/** Chain slack measured at the middle of the lower run. */
export const CHAIN_SLACK_MM = { min: 10, max: 15 };

export const CORNERS = ["VL", "VR", "AL", "AR"] as const;
export type Corner = (typeof CORNERS)[number];

const fieldOf = (name: string) => SETUP_FIELDS.find((f) => f.name === name)!;
export const CORNER_FIELDS: Record<Corner, SetupField> = {
  VL: fieldOf("pressure_fl"),
  VR: fieldOf("pressure_fr"),
  AL: fieldOf("pressure_rl"),
  AR: fieldOf("pressure_rr"),
};

export function tyreStatus(value: number | null, target: number | null): CheckStatus {
  if (value === null || target === null) return "open";
  return Math.abs(value - target) <= TYRE_TOLERANCE_BAR + 1e-9 ? "ok" : "fail";
}

const bar = (v: number, digits: number) => v.toFixed(digits).replace(".", ",");

/** What to do about a wheel outside the band, e.g. "0,031 bar te hoog. Laat af tot 0,58 en meet opnieuw." */
export function tyreAdvice(value: number, target: number, tr: { tooHigh: string; tooLow: string }): string {
  const diff = value - target;
  return format(diff > 0 ? tr.tooHigh : tr.tooLow, { diff: bar(Math.abs(diff), 3), target: bar(target, 2) });
}

export function chainStatus(mm: number | null): CheckStatus {
  if (mm === null) return "open";
  return mm >= CHAIN_SLACK_MM.min && mm <= CHAIN_SLACK_MM.max ? "ok" : "fail";
}

/** Engine hours against the revision interval: amber past 75%, red past the limit. */
export function hoursStatus(minutes: number, limit: number): CheckStatus {
  const share = minutes / limit;
  return share > 1 ? "fail" : share > 0.75 ? "warn" : "ok";
}

const CODES: Record<string, string> = { practice: "VT", qualifying: "Q", heat: "H", prefinal: "PF", final: "F", test: "T" };
/** The order a race day usually runs in, to suggest the next session. */
export const DAY_ORDER = ["practice", "qualifying", "heat", "prefinal", "final"] as const;

/** "Q1" for the first qualifying of the event, "VT2" for the second free practice. */
export function sessionLabel(type: string, alreadyDriven: number): string {
  return `${CODES[type] ?? "S"}${alreadyDriven + 1}`;
}

/** A label as the reader writes it: it is stored as "VT1", shown as "FP1" in English. */
export function displayLabel(label: string, practiceCode: string): string {
  return label.replace(/^VT/, practiceCode);
}

/** Statuses counted for the progress bar: a warning is in order, but marked. */
export function tally(statuses: CheckStatus[]) {
  return {
    ok: statuses.filter((s) => s === "ok" || s === "warn").length,
    fail: statuses.filter((s) => s === "fail").length,
    open: statuses.filter((s) => s === "open").length,
    total: statuses.length,
  };
}
