"use client";

import { useEffect, useRef, useState } from "react";

import { useT } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/locales";

// SpeedTrace + DeltaTrace over one lap in the distance domain, sharing one crosshair: the channel of
// your lap (volt, 2px) against the reference (violet, 1.5px), and below it the running time difference
// (above the zero line is slower, red with a 20% fill). Corner hairlines T1…Tn run through both.

export type TraceCorner = { name: string; apex_m: number };

type Props = {
  sampleM: number;
  you: number[];
  reference: number[];
  delta: number[];
  corners: TraceCorner[];
  channel: { code: string; label: string; unit: string; digits: number };
};

const TRACE_H = 230;
const DELTA_H = 120;
const GAP = 34;
const PAD = { left: 40, right: 12, top: 22, bottom: 22 };

const fmt = (value: number, digits: number) => value.toFixed(digits).replace(".", ",");
const signed = (s: number) => `${s > 0 ? "+" : s < 0 ? "−" : "±"}${fmt(Math.abs(s), 3)}`;

function path(values: number[], x: (i: number) => number, y: (v: number) => number, step: number) {
  let d = "";
  for (let i = 0; i < values.length; i += step) d += `${d ? "L" : "M"}${x(i).toFixed(1)},${y(values[i]).toFixed(1)}`;
  const last = values.length - 1;
  return `${d}L${x(last).toFixed(1)},${y(values[last]).toFixed(1)}`;
}

function niceTicks(min: number, max: number, count: number) {
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

export function TraceChart({ sampleM, you, reference, delta, corners, channel }: Props) {
  const tt = useT().telemetry;
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n = you.length;
  const lengthM = (n - 1) * sampleM;
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const x = (i: number) => PAD.left + (i / (n - 1)) * innerW;
  const step = Math.max(1, Math.floor(n / Math.max(120, innerW)));

  const all = [...you, ...reference];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1;
  const [yMin, yMax] = [lo - pad, hi + pad];
  const traceTop = PAD.top;
  const y = (v: number) => traceTop + (1 - (v - yMin) / (yMax - yMin)) * TRACE_H;
  const yTicks = niceTicks(yMin, yMax, 4);

  const deltaTop = traceTop + TRACE_H + GAP;
  const dMax = Math.max(0.05, ...delta.map(Math.abs)) * 1.1;
  const yd = (v: number) => deltaTop + DELTA_H / 2 - (v / dMax) * (DELTA_H / 2);
  const zero = yd(0);
  const height = deltaTop + DELTA_H + PAD.bottom;
  const xTicks = niceTicks(0, lengthM, Math.max(3, Math.round(innerW / 110)));

  const deltaPath = path(delta, x, yd, step);
  const fillPath = `${deltaPath}L${x(n - 1).toFixed(1)},${zero.toFixed(1)}L${x(0).toFixed(1)},${zero.toFixed(1)}Z`;

  function onMove(event: React.PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const i = Math.round(((event.clientX - rect.left) / rect.width) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  const h = hover;
  const tooltipLeft = h === null ? 0 : x(h) > width - 190 ? x(h) - 182 : x(h) + 10;

  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2">
      <div className="channel-label flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span>
          {channel.code} {channel.label} [{channel.unit.toUpperCase()}]
        </span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0.5 w-4 bg-brand-400" />
            {tt.you}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-px w-4 bg-ref" />
            {tt.ref}
          </span>
        </span>
      </div>
      {/* The height is known before the width is measured, so the page does not jump. */}
      <div ref={box} className="relative min-w-0 overflow-hidden" style={{ minHeight: PAD.top + TRACE_H + GAP + DELTA_H + PAD.bottom }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={format(tt.chartAria, { channel: channel.label })} className="block">
            {/* Grid and axes: recessive. */}
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-zinc-800)" strokeWidth={1} />
                <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" className="fill-zinc-500 font-mono text-[10px]">
                  {fmt(t, channel.digits > 0 && yMax - yMin < 4 ? channel.digits : 0)}
                </text>
              </g>
            ))}
            {corners.map((c) => {
              const cx = PAD.left + (c.apex_m / lengthM) * innerW;
              return (
                <g key={c.name}>
                  <line
                    x1={cx}
                    x2={cx}
                    y1={traceTop - 4}
                    y2={deltaTop + DELTA_H}
                    stroke="var(--color-zinc-700)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                  <text x={cx} y={traceTop - 8} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
                    {c.name}
                  </text>
                </g>
              );
            })}

            <path d={path(reference, x, y, step)} fill="none" stroke="var(--color-ref)" strokeWidth={1.5} strokeLinejoin="round" />
            <path d={path(you, x, y, step)} fill="none" stroke="var(--color-brand-400)" strokeWidth={2} strokeLinejoin="round" />

            {/* Delta: zero line, red line and fill. Above is slower. */}
            <text x={PAD.left} y={deltaTop - 10} className="fill-zinc-500 font-mono text-[10px] tracking-wider">
              {tt.deltaCaption}
            </text>
            <line x1={PAD.left} x2={width - PAD.right} y1={zero} y2={zero} stroke="var(--color-zinc-600)" strokeWidth={1} />
            <text x={PAD.left - 6} y={yd(dMax / 1.1) + 3} textAnchor="end" className="fill-zinc-500 font-mono text-[10px]">
              +{fmt(dMax / 1.1, 2)}
            </text>
            <text x={PAD.left - 6} y={yd(-dMax / 1.1) + 3} textAnchor="end" className="fill-zinc-500 font-mono text-[10px]">
              −{fmt(dMax / 1.1, 2)}
            </text>
            <path d={fillPath} fill="var(--color-red-400)" fillOpacity={0.2} />
            <path d={deltaPath} fill="none" stroke="var(--color-red-400)" strokeWidth={2} strokeLinejoin="round" />

            {xTicks.map((t) => (
              <text key={t} x={PAD.left + (t / lengthM) * innerW} y={height - 6} textAnchor="middle" className="fill-zinc-500 font-mono text-[10px]">
                {Math.round(t)} m
              </text>
            ))}

            {h !== null && (
              <g pointerEvents="none">
                <line x1={x(h)} x2={x(h)} y1={traceTop} y2={deltaTop + DELTA_H} stroke="var(--color-zinc-300)" strokeWidth={1} />
                <circle cx={x(h)} cy={y(reference[h])} r={4} fill="var(--color-ref)" stroke="var(--color-zinc-950)" strokeWidth={2} />
                <circle cx={x(h)} cy={y(you[h])} r={4} fill="var(--color-brand-400)" stroke="var(--color-zinc-950)" strokeWidth={2} />
                <circle cx={x(h)} cy={yd(delta[h])} r={4} fill="var(--color-red-400)" stroke="var(--color-zinc-950)" strokeWidth={2} />
              </g>
            )}
            <rect
              x={PAD.left}
              y={traceTop}
              width={innerW}
              height={deltaTop + DELTA_H - traceTop}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
              style={{ touchAction: "pan-y" }}
            />
          </svg>
        )}
        {h !== null && (
          <div
            className="pointer-events-none absolute top-6 w-44 border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs tabular-nums"
            style={{ left: tooltipLeft }}
          >
            <p className="text-zinc-400">{Math.round(h * sampleM)} m</p>
            <p className="flex justify-between text-zinc-50">
              <span>{tt.you}</span>
              <span>
                {fmt(you[h], channel.digits)} {channel.unit}
              </span>
            </p>
            <p className="flex justify-between text-zinc-300">
              <span>{tt.ref}</span>
              <span>
                {fmt(reference[h], channel.digits)} {channel.unit}
              </span>
            </p>
            <p className={`flex justify-between ${delta[h] > 0 ? "text-red-300" : "text-brand-300"}`}>
              <span>{tt.diff}</span>
              <span>{signed(delta[h])}</span>
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}
