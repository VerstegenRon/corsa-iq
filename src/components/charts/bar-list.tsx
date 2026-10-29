// Horizontal bars with the name above and the value at the end: for comparing a handful of amounts
// (spend per category). Every value is written out, so the bar colour is never needed to read it.

export type BarRow = { key: string; label: string; value: number; valueLabel: string; color: string; detail?: string };

export function BarList({ rows, label }: { rows: BarRow[]; label: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} title={row.detail ?? `${row.label}: ${row.valueLabel}`} className="group">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-zinc-200">{row.label}</span>
            <span className="shrink-0 font-medium text-zinc-50 tabular-nums">{row.valueLabel}</span>
          </div>
          {/* Square at the start, rounded at the data end. */}
          <div className="mt-1.5 h-2.5">
            <div
              className="h-full rounded-r-full transition-[filter] group-hover:brightness-110"
              style={{ width: `${Math.max((row.value / max) * 100, 2)}%`, background: row.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
