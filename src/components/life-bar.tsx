// Used against a limit: a bar with a white limit mark. Volt while fine, amber past 75%, red past the
// limit, always with the words too (the labels are in the dictionary under `seasonOverview`).

export type LifeState = "ok" | "plan" | "over";

export const LIFE_STATE: Record<LifeState, { label: "stateOk" | "statePlan" | "stateOver"; color: string }> = {
  ok: { label: "stateOk", color: "var(--color-brand-400)" },
  plan: { label: "statePlan", color: "var(--color-amber-400)" },
  over: { label: "stateOver", color: "var(--color-red-400)" },
};

export function lifeState(share: number): LifeState {
  return share > 1 ? "over" : share > 0.75 ? "plan" : "ok";
}

export function LifeBar({ share, label, valueText }: { share: number; label: string; valueText: string }) {
  // The scale reaches a bit past the limit (or past the use, when over), so the limit mark stays visible.
  const scale = Math.max(1.15, share * 1.05);
  const state = lifeState(share);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
      aria-valuetext={valueText}
      className="relative h-3.5 bg-zinc-800"
    >
      <div className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, (share / scale) * 100)}%`, background: LIFE_STATE[state].color }} />
      <div aria-hidden="true" className="absolute -top-1.5 h-6 w-0.5 bg-zinc-50" style={{ left: `${(1 / scale) * 100}%` }} />
    </div>
  );
}
