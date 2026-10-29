"use client";

// A few series over the same steps (tyre pressure per session), each in its own colour with a
// legend. A crosshair snaps to the nearest step and lists every series there.

import { useEffect, useId, useRef, useState } from "react";

import { CHART_CHROME } from "./palette";

export type LineSeries = { key: string; label: string; color: string; values: (number | null)[] };

const HEIGHT = 170;
const PAD = { top: 16, right: 16, bottom: 26, left: 44 };

export function LineChart({
  series,
  steps,
  label,
  format,
  minRange,
}: {
  series: LineSeries[];
  /** One label per step on the x-axis, e.g. "S1"; the title is for the tooltip. */
  steps: { label: string; title: string }[];
  label: string;
  format: (value: number) => string;
  /** Smallest span of the y-axis, so tiny differences do not look dramatic. */
  minRange: number;
}) {
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

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (all.length === 0) return null;
  const mid = (Math.min(...all) + Math.max(...all)) / 2;
  const span = Math.max(Math.max(...all) - Math.min(...all), minRange) * 1.2;
  const yMin = mid - span / 2;
  const yMax = mid + span / 2;
  const ticks = [yMin + span * 0.1, mid, yMax - span * 0.1];

  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (steps.length === 1 ? plotW / 2 : (i / (steps.length - 1)) * plotW);
  const y = (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * plotH;

  const path = (values: (number | null)[]) =>
    values
      .map((v, i) => (v === null ? null : `${i === 0 || values[i - 1] === null ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join("");

  function nearest(clientX: number, svg: SVGSVGElement) {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * width;
    let best = 0;
    steps.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    return best;
  }

  return (
    <figure ref={ref} className="relative min-w-0 overflow-hidden">
      <figcaption id={titleId} className="sr-only">
        {label}.{" "}
        {series.map((s) => `${s.label}: ${s.values.map((v, i) => `${steps[i].label} ${v === null ? "—" : format(v)}`).join(", ")}`).join(". ")}
      </figcaption>
      <svg
        role="img"
        aria-labelledby={titleId}
        tabIndex={0}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
        onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? steps.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          const delta = e.key === "ArrowRight" ? 1 : -1;
          setActive((a) => Math.min(steps.length - 1, Math.max(0, (a ?? steps.length - 1) + delta)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={CHART_CHROME.grid} strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={CHART_CHROME.axis} className="tabular-nums">
              {format(t)}
            </text>
          </g>
        ))}
        {steps.map((s, i) => (
          <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill={CHART_CHROME.axis}>
            {s.label}
          </text>
        ))}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke={CHART_CHROME.axis} strokeWidth={1} />}
        {series.map((s) => (
          <g key={s.key}>
            <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) =>
              v === null ? null : (
                <circle key={i} cx={x(i)} cy={y(v)} r={i === active ? 5 : 4} fill={s.color} stroke={CHART_CHROME.surface} strokeWidth={2} />
              ),
            )}
          </g>
        ))}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-300">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>

      {active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(active), 80), width - 80) }}
        >
          {series.map((s) => (
            <p key={s.key} className="flex items-center gap-2 text-sm font-semibold text-zinc-50 tabular-nums">
              <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              {s.values[active] === null ? "—" : format(s.values[active]!)}
              <span className="text-xs font-normal text-zinc-400">{s.label}</span>
            </p>
          ))}
          <p className="mt-0.5 whitespace-nowrap text-zinc-400">{steps[active].title}</p>
        </div>
      )}
    </figure>
  );
}
