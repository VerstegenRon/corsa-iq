// The chart series colours (globals.css defines them per theme). Assign them in this order, and by
// the thing they stand for, not by rank, so a category keeps its colour whatever is filtered.

export const CHART_COLORS = [
  "var(--chart-1)", // blue
  "var(--chart-2)", // orange
  "var(--chart-3)", // aqua
  "var(--chart-4)", // yellow
  "var(--chart-5)", // magenta
  "var(--chart-6)", // green
  "var(--chart-7)", // violet
  "var(--chart-8)", // red
] as const;

/** Chart chrome: hairline grid, muted axis text, primary label text, and the card for marker rings. */
export const CHART_CHROME = {
  grid: "var(--color-zinc-800)",
  axis: "var(--color-zinc-500)",
  label: "var(--color-zinc-200)",
  surface: "var(--chart-surface)",
};

/** A fixed colour per key from an ordered list of keys (e.g. expense categories). */
export function colorFor(keys: readonly string[], key: string): string {
  const index = keys.indexOf(key);
  return CHART_COLORS[(index < 0 ? keys.length : index) % CHART_COLORS.length];
}
