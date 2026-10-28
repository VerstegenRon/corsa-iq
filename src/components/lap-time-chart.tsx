"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useT } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/locales";
import { formatLapTime } from "@/lib/karting";

// One series of lap times as a line: the fastest point is the accent and is labelled,
// everything else stays quiet. Colors are the app's dark-surface tokens (validated for
// contrast against the card surface); text uses text tokens, never the series color.
const COLORS = {
  line: "#22d3ee", // cyan-400, the app accent
  surface: "#111113", // card surface (zinc-900/50 on zinc-950), used for marker rings
  grid: "#27272a", // zinc-800 hairline
  axis: "#71717a", // zinc-500, muted text
  label: "#e4e4e7", // zinc-200, primary text
};

export type LapPoint = {
  key: string;
  /** Short x-axis label, e.g. the lap number or a date. */
  xLabel: string;
  ms: number;
  /** First line of the tooltip, e.g. "Ronde 4" or "Ronde 2 – Genk, 14 apr". */
  title: string;
  /** Optional second line, e.g. the gap to the best lap. */
  detail?: string;
  /** Horizontal position (lap number, or days since the first event). Defaults to the point's index. */
  position?: number;
  /** Start a new line segment here, e.g. after a lap that is left out. */
  breakBefore?: boolean;
};

const HEIGHT = 220;
const PAD = { top: 24, right: 16, bottom: 28, left: 56 };

/** Clean tick step for a range in ms: 0.1 s, 0.2 s, 0.5 s, 1 s, 2 s, … */
function tickStep(range: number) {
  const steps = [100, 200, 500, 1000, 2000, 5000, 10_000, 30_000, 60_000];
  return steps.find((step) => range / step <= 5) ?? 60_000;
}

export function LapTimeChart({ points, label }: { points: LapPoint[]; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const t = useT();

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (points.length < 2) return null;

  const times = points.map((p) => p.ms);
  const bestMs = Math.min(...times);
  const bestIndex = times.indexOf(bestMs);
  const rawMin = bestMs;
  const rawMax = Math.max(...times);
  const step = tickStep(Math.max(rawMax - rawMin, 100));
  const yMin = Math.floor(rawMin / step) * step;
  const yMax = Math.max(Math.ceil(rawMax / step) * step, yMin + step);
  const ticks: number[] = [];
  for (let t = yMin; t <= yMax + 1; t += step) ticks.push(t);

  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const positions = points.map((p, i) => p.position ?? i);
  const xMin = positions[0];
  const xSpan = Math.max(positions.at(-1)! - xMin, 1);
  const x = (i: number) => PAD.left + ((positions[i] - xMin) / xSpan) * plotW;
  const y = (ms: number) => PAD.top + ((yMax - ms) / (yMax - yMin)) * plotH;

  const path = points
    .map((p, i) => `${i === 0 || p.breakBefore ? "M" : "L"}${x(i).toFixed(1)},${y(p.ms).toFixed(1)}`)
    .join("");
  // Markers on every point only while they have room to breathe; the best point always gets one.
  // A point after a break has no line to its left, so it always keeps its marker.
  const showMarkers = plotW / points.length >= 14;
  // Thin the x labels so they never collide: skip any label closer than 44px to the last one drawn.
  const shownLabels = new Set<number>();
  let lastLabelX = -Infinity;
  points.forEach((_, i) => {
    if (x(i) - lastLabelX >= 44) {
      shownLabels.add(i);
      lastLabelX = x(i);
    }
  });

  function nearestIndex(clientX: number, svg: SVGSVGElement) {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * width;
    let nearest = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(nearest) - px)) nearest = i;
    });
    return nearest;
  }

  const activePoint = active === null ? null : points[active];
  const tooltipLeft = active === null ? 0 : Math.min(Math.max(x(active), 80), width - 80);

  return (
    <figure ref={containerRef} className="relative min-w-0 overflow-hidden">
      <figcaption id={titleId} className="sr-only">
        {format(t.chart.summary, { label, time: formatLapTime(bestMs), title: points[bestIndex].title })}
      </figcaption>
      <svg
        role="img"
        aria-labelledby={titleId}
        tabIndex={0}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        onPointerMove={(e) => setActive(nearestIndex(e.clientX, e.currentTarget))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? bestIndex)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const delta = e.key === "ArrowRight" ? 1 : -1;
            setActive((a) => Math.min(points.length - 1, Math.max(0, (a ?? bestIndex) + delta)));
          }
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={COLORS.grid} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={COLORS.axis} className="tabular-nums">
              {formatLapTime(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          shownLabels.has(i) ? (
            <text key={p.key} x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill={COLORS.axis} className="tabular-nums">
              {p.xLabel}
            </text>
          ) : null,
        )}

        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke={COLORS.axis} strokeWidth={1} />
        )}

        <path d={path} fill="none" stroke={COLORS.line} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) =>
          showMarkers || i === bestIndex || i === active || p.breakBefore || points[i + 1]?.breakBefore ? (
            <circle
              key={p.key}
              cx={x(i)}
              cy={y(p.ms)}
              r={i === bestIndex || i === active ? 5 : 4}
              fill={COLORS.line}
              stroke={COLORS.surface}
              strokeWidth={2}
            />
          ) : null,
        )}

        {/* The one direct label: the fastest time, above its point. */}
        <text
          x={Math.min(Math.max(x(bestIndex), PAD.left + 24), width - PAD.right - 24)}
          y={y(bestMs) - 12}
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          fill={COLORS.label}
          className="tabular-nums"
        >
          {formatLapTime(bestMs)}
        </text>
      </svg>

      {activePoint && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltipLeft }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-50 tabular-nums">
            <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded-full" style={{ background: COLORS.line }} />
            {formatLapTime(activePoint.ms)}
          </p>
          <p className="mt-0.5 whitespace-nowrap text-zinc-400">{activePoint.title}</p>
          {activePoint.detail && <p className="whitespace-nowrap text-zinc-500 tabular-nums">{activePoint.detail}</p>}
        </div>
      )}
    </figure>
  );
}
