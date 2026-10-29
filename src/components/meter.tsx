// A thin bar for "used of a limit" (run time, budget), and a small status pill. Fine is volt, amber
// and red mean attention (the pill adds a symbol, so colour is never the only signal). The empty part
// of the bar is a light tint of the same colour.

import type { ReactNode } from "react";

export type Tone = "ok" | "soon" | "due";

const barColor: Record<Tone, string> = { ok: "var(--color-brand-400)", soon: "var(--color-amber-400)", due: "var(--color-red-400)" };

/** Share of the limit used: below 90% fine, from 90% soon, at 100% due. */
export function toneForShare(share: number): Tone {
  return share >= 1 ? "due" : share >= 0.9 ? "soon" : "ok";
}

export function Meter({ share, tone = toneForShare(share), label }: { share: number; tone?: Tone; label: string }) {
  const percent = Math.min(Math.max(share, 0), 1) * 100;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
      className="h-2 overflow-hidden rounded-full"
      style={{ background: `color-mix(in oklab, ${barColor[tone]} 18%, transparent)` }}
    >
      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: barColor[tone] }} />
    </div>
  );
}

const chipClass = {
  neutral: "border-zinc-700 text-zinc-300",
  brand: "border-brand-400/40 text-brand-200",
  soon: "border-amber-400/40 text-amber-300",
  due: "border-red-400/40 text-red-300",
} as const;

const chipSymbol = { neutral: null, brand: null, soon: "▲", due: "●" } as const;

export function Chip({ tone = "neutral", children }: { tone?: keyof typeof chipClass; children: ReactNode }) {
  const symbol = chipSymbol[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${chipClass[tone]}`}>
      {symbol && <span aria-hidden="true">{symbol}</span>}
      {children}
    </span>
  );
}
