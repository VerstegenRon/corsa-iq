// The setup tree as a git-like graph: the fastest line straight across in volt, side branches below it
// dashed in grey, a wet branch in violet, the setup on the kart now with a dotted ring.

import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format, plural } from "@/lib/i18n/locales";
import { formatLapTime } from "@/lib/karting";
import type { Version } from "@/lib/setup-tree";

const LANE = 66;
const TOP = 44;

export function SetupGraph({ versions, ts }: { versions: Version[]; ts: Dictionary["setup"] }) {
  const width = Math.max(334, 44 + (versions.length - 1) * 64);
  const step = versions.length > 1 ? (width - 44) / (versions.length - 1) : 0;
  let lanes = 0;
  const pos = new Map<string, { x: number; y: number }>();
  versions.forEach((v, i) => {
    const y = v.onFastestLine ? TOP : TOP + LANE * ++lanes;
    pos.set(v.id, { x: 22 + i * step, y });
  });
  const height = TOP + LANE * lanes + 40;
  const line = versions.filter((v) => v.onFastestLine).map((v) => v.label);
  const branches = versions.filter((v) => !v.onFastestLine).map((v) => v.label);

  return (
    <svg
      role="img"
      aria-label={[
        format(ts.graphAria, { count: versions.length }),
        line.length > 1 ? format(ts.graphLine, { line: line.join(ts.graphVia) }) : null,
        branches.length > 0 ? format(plural(branches.length, ts.graphBranch), { names: branches.join(ts.graphAnd) }) : null,
      ]
        .filter(Boolean)
        .join(" ")}
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full max-w-[720px]"
    >
      {versions.map((v) => {
        if (!v.parent) return null;
        const a = pos.get(v.parent.id)!;
        const b = pos.get(v.id)!;
        if (v.onFastestLine && v.parent.onFastestLine) {
          return <line key={v.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--color-brand-400)" strokeWidth="3" />;
        }
        const mid = (a.y + b.y) / 2;
        return (
          <path
            key={v.id}
            d={`M${a.x} ${a.y} C${a.x} ${mid + 20} ${b.x} ${mid - 20} ${b.x} ${b.y}`}
            fill="none"
            stroke={v.wet ? "var(--color-ref)" : "var(--color-zinc-600)"}
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        );
      })}

      {versions.map((v) => {
        const { x, y } = pos.get(v.id)!;
        const color = v.wet ? "var(--color-ref)" : v.onFastestLine ? "var(--color-brand-400)" : "var(--color-zinc-600)";
        const time = v.bestMs !== null ? formatLapTime(v.bestMs) : v.isCurrent ? ts.now : "—";
        return (
          <g key={v.id}>
            {v.isFastest ? (
              <circle cx={x} cy={y} r="11" fill="var(--color-brand-400)" />
            ) : (
              <circle cx={x} cy={y} r={v.onFastestLine ? 9 : 8} fill="var(--background)" stroke={color} strokeWidth={v.onFastestLine ? 2 : 1.5} />
            )}
            {v.isCurrent && <circle cx={x} cy={y} r="16" fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 3" />}
            {v.onFastestLine ? (
              <>
                <text x={x} y={y - 22} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="11" fontWeight="700" fill={v.isFastest ? "var(--color-brand-300)" : "var(--color-zinc-50)"}>
                  {v.label}
                </text>
                <text x={x} y={y + 30} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9.5" fill={v.isFastest ? "var(--color-brand-300)" : "var(--color-zinc-500)"}>
                  {time}
                </text>
              </>
            ) : (
              <>
                <text x={x + 14} y={y - 2} fontFamily="var(--font-mono)" fontSize="11" fontWeight="700" fill={v.wet ? "var(--color-ref)" : "var(--color-zinc-50)"}>
                  {v.label}
                </text>
                <text x={x + 14} y={y + 12} fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--color-zinc-500)">
                  {time}
                  {v.wet ? ` · ${ts.wet}` : v.isLeaf && !v.isCurrent ? ` · ${ts.notPursued}` : ""}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
