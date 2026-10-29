"use client";

// Columns for an amount per period (run time per month). One colour for the series, a second for the
// column that matters now (this month); hover or arrow keys show each value.

import { useEffect, useId, useRef, useState } from "react";

import { CHART_CHROME, CHART_COLORS } from "./palette";

export type Column = { key: string; label: string; value: number; valueLabel: string; title: string; highlight?: boolean };

const HEIGHT = 200;
const PAD = { top: 24, right: 8, bottom: 26, left: 40 };
const MAX_BAR = 24;

function niceStep(max: number) {
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  return [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? magnitude * 10;
}

export function ColumnChart({
  columns,
  label,
  unit = "plain",
  color = CHART_COLORS[0],
  highlightColor = CHART_COLORS[1],
}: {
  columns: Column[];
  label: string;
  /** How axis values read: minutes as "1 u" / "30m", or the plain number. */
  unit?: "minutes" | "plain";
  color?: string;
  highlightColor?: string;
}) {
  const formatTick = (v: number) => (unit === "minutes" ? (v >= 60 ? `${Math.round((v / 60) * 10) / 10} u` : `${v}m`) : String(v));
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(...columns.map((c) => c.value), 1);
  const step = niceStep(max);
  const yMax = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / columns.length;
  const barW = Math.min(MAX_BAR, band - 4);
  const xCenter = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  // Only the highlighted column (or else the biggest) carries its value as a direct label.
  const labelled = Math.max(columns.findIndex((c) => c.highlight), columns.findIndex((c) => c.value === max));
  const activeColumn = active === null ? null : columns[active];

  return (
    <figure ref={ref} className="relative min-w-0 overflow-hidden">
      <figcaption id={titleId} className="sr-only">
        {label}: {columns.map((c) => `${c.title} ${c.valueLabel}`).join(", ")}
      </figcaption>
      <svg
        role="img"
        aria-labelledby={titleId}
        tabIndex={0}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? (labelled >= 0 ? labelled : 0))}
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const delta = e.key === "ArrowRight" ? 1 : -1;
          setActive((a) => Math.min(columns.length - 1, Math.max(0, (a ?? 0) + delta)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={CHART_CHROME.grid} strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={CHART_CHROME.axis} className="tabular-nums">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {columns.map((c, i) => {
          const h = Math.max(plotH - (y(c.value) - PAD.top), c.value > 0 ? 2 : 0);
          const x0 = xCenter(i) - barW / 2;
          const top = PAD.top + plotH - h;
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={c.key} onPointerEnter={() => setActive(i)}>
              {/* The whole band is the hit target, not just the painted bar. */}
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x0},${top + h} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${top + h} Z`}
                  fill={c.highlight ? highlightColor : color}
                  opacity={active === null || active === i ? 1 : 0.55}
                />
              )}
              <text x={xCenter(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill={CHART_CHROME.axis}>
                {c.label}
              </text>
              {i === labelled && c.value > 0 && (
                <text x={xCenter(i)} y={top - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill={CHART_CHROME.label} className="tabular-nums">
                  {c.valueLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {activeColumn && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(xCenter(active!), 70), width - 70) }}
        >
          <p className="text-sm font-semibold text-zinc-50 tabular-nums">{activeColumn.valueLabel}</p>
          <p className="whitespace-nowrap text-zinc-400">{activeColumn.title}</p>
        </div>
      )}
    </figure>
  );
}
