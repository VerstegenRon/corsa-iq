// The packing list: categories, and the standard list a garage can start from.

import type { IconName } from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { CHART_COLORS } from "@/components/charts/palette";

export const CHECKLIST_CATEGORIES = {
  tools: { icon: "wrench", color: CHART_COLORS[0] },
  tyres: { icon: "tyre", color: CHART_COLORS[1] },
  fuel: { icon: "fuel", color: CHART_COLORS[2] },
  spares: { icon: "engine", color: CHART_COLORS[3] },
  driver: { icon: "helmet", color: CHART_COLORS[4] },
  papers: { icon: "receipt", color: CHART_COLORS[6] },
  other: { icon: "part", color: CHART_COLORS[5] },
} satisfies Record<keyof Dictionary["checklist"]["categories"], { icon: IconName; color: string }>;

export type ChecklistCategory = keyof typeof CHECKLIST_CATEGORIES;

export function isChecklistCategory(value: string): value is ChecklistCategory {
  return value in CHECKLIST_CATEGORIES;
}

/** A typical list for a karting weekend; the garage edits it to its own. Titles are in the dictionary. */
const DEFAULT_CHECKLIST: { key: keyof Dictionary["checklist"]["defaultItems"]; category: ChecklistCategory }[] = [
  { key: "toolbox", category: "tools" },
  { key: "torqueWrench", category: "tools" },
  { key: "pressureGauge", category: "tools" },
  { key: "kartStand", category: "tools" },
  { key: "chainSpray", category: "tools" },
  { key: "slicks", category: "tyres" },
  { key: "wets", category: "tyres" },
  { key: "spareRims", category: "tyres" },
  { key: "tyrePump", category: "tyres" },
  { key: "fuelCan", category: "fuel" },
  { key: "twoStrokeOil", category: "fuel" },
  { key: "mixCup", category: "fuel" },
  { key: "sparkPlugs", category: "spares" },
  { key: "sprockets", category: "spares" },
  { key: "spareChain", category: "spares" },
  { key: "jets", category: "spares" },
  { key: "helmet", category: "driver" },
  { key: "suit", category: "driver" },
  { key: "gloves", category: "driver" },
  { key: "shoes", category: "driver" },
  { key: "ribProtector", category: "driver" },
  { key: "rainSuit", category: "driver" },
  { key: "licence", category: "papers" },
  { key: "entryConfirmation", category: "papers" },
  { key: "transponder", category: "other" },
  { key: "loggerCharged", category: "other" },
];

export const DEFAULT_CHECKLIST_SIZE = DEFAULT_CHECKLIST.length;

/** The standard list in the reader's language, as it is saved for the garage. */
export function defaultChecklist(tc: Dictionary["checklist"]): { title: string; category: ChecklistCategory }[] {
  return DEFAULT_CHECKLIST.map(({ key, category }) => ({ title: tc.defaultItems[key], category }));
}
