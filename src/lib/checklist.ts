// The packing list: categories, and the standard list a garage can start from.

import type { IconName } from "@/components/icons";
import { CHART_COLORS } from "@/components/charts/palette";

export const CHECKLIST_CATEGORIES = {
  tools: { label: "Gereedschap", icon: "wrench", color: CHART_COLORS[0] },
  tyres: { label: "Banden & wielen", icon: "tyre", color: CHART_COLORS[1] },
  fuel: { label: "Brandstof & olie", icon: "fuel", color: CHART_COLORS[2] },
  spares: { label: "Reserveonderdelen", icon: "engine", color: CHART_COLORS[3] },
  driver: { label: "Coureur & kleding", icon: "helmet", color: CHART_COLORS[4] },
  papers: { label: "Papieren", icon: "receipt", color: CHART_COLORS[6] },
  other: { label: "Overig", icon: "part", color: CHART_COLORS[5] },
} satisfies Record<string, { label: string; icon: IconName; color: string }>;

export type ChecklistCategory = keyof typeof CHECKLIST_CATEGORIES;

export function isChecklistCategory(value: string): value is ChecklistCategory {
  return value in CHECKLIST_CATEGORIES;
}

/** A typical list for a karting weekend; the garage edits it to its own. */
export const DEFAULT_CHECKLIST: { title: string; category: ChecklistCategory }[] = [
  { title: "Gereedschapskist", category: "tools" },
  { title: "Momentsleutel", category: "tools" },
  { title: "Bandenspanningsmeter", category: "tools" },
  { title: "Kartbok / standaard", category: "tools" },
  { title: "Kettingspray en poetsdoeken", category: "tools" },
  { title: "Set slicks", category: "tyres" },
  { title: "Set regenbanden", category: "tyres" },
  { title: "Reservevelgen", category: "tyres" },
  { title: "Bandenpomp of compressor", category: "tyres" },
  { title: "Jerrycan brandstof", category: "fuel" },
  { title: "Tweetaktolie", category: "fuel" },
  { title: "Maatbeker voor de mengsmering", category: "fuel" },
  { title: "Bougies", category: "spares" },
  { title: "Tandwielen voor en achter", category: "spares" },
  { title: "Reserveketting", category: "spares" },
  { title: "Sproeiers", category: "spares" },
  { title: "Helm", category: "driver" },
  { title: "Overall", category: "driver" },
  { title: "Handschoenen", category: "driver" },
  { title: "Schoenen", category: "driver" },
  { title: "Ribbeschermer", category: "driver" },
  { title: "Regenpak", category: "driver" },
  { title: "Licentie", category: "papers" },
  { title: "Inschrijfbevestiging", category: "papers" },
  { title: "Transponder", category: "other" },
  { title: "Datalogger opgeladen", category: "other" },
];
