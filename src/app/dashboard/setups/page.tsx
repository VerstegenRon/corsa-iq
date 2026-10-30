import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { cardClass, inputClass, linkClass, secondaryButtonClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format, plural } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { formatDate, formatGapSeconds, labelFor } from "@/lib/karting";
import { compareRows, type Version } from "@/lib/setup-tree";
import { loadSetupTree } from "@/lib/setup-tree-data";
import { PlanLock } from "@/components/plan-lock";
import { getPlanAccess } from "@/lib/plan-access";

import { SetupGraph } from "./setup-graph";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getDictionary()).setup.metaTitle} — CorsaIQ` };
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

/** The difference with the parent as a chip: a gain in volt, a loss in red, wet in violet. */
function DeltaChip({ v, ts }: { v: Version; ts: Dictionary["setup"] }) {
  if (v.wet) return <span className="border border-ref px-1.5 py-0.5 font-mono text-[13px] font-bold text-ref">{ts.wetChip}</span>;
  if (v.deltaMs === null)
    return (
      <span className="bg-zinc-800 px-1.5 py-0.5 font-mono text-[13px] font-bold text-zinc-50">{v.isCurrent && v.bestMs === null ? ts.nowChip : "—"}</span>
    );
  const gain = v.deltaMs < 0;
  return (
    <span className={`px-1.5 py-0.5 font-mono text-[13px] font-bold ${gain ? "bg-brand-500 text-on-brand" : "bg-red-400 text-zinc-950"}`}>
      {formatGapSeconds(v.deltaMs)}
    </span>
  );
}

export default async function SetupsPage({ searchParams }: PageProps<"/dashboard/setups">) {
  const query = await searchParams;
  const [{ supabase, garage }, t, locale] = await Promise.all([getCurrentGarage(), getDictionary(), getLocale()]);
  const ts = t.setup;
  if (!(await getPlanAccess()).has("setupCompare")) return <PlanLock feature="setupCompare" />;

  const { karts, kartId, versions, trackName: track } = await loadSetupTree(supabase, garage.id, ts, typeof query.kart === "string" ? query.kart : null);
  const newestFirst = [...versions].reverse();
  const fastest = versions.find((v) => v.isFastest);
  const current = versions.find((v) => v.isCurrent);
  const a = versions.find((v) => v.label === query.a) ?? fastest ?? versions[0];
  const b = versions.find((v) => v.label === query.b) ?? current ?? versions.at(-1);
  const rows = a && b ? compareRows(a.values, b.values, ts) : [];
  const kartName = karts.find(([id]) => id === kartId)?.[1];

  const meta = (v: Version) => {
    const last = v.sessions.at(-1);
    if (!last) return ts.notDriven;
    if (v.bestMs === null) return ts.noTimeYet;
    const fastestSession = v.sessions.find((s) => s.bestLapMs === v.bestMs) ?? last;
    return [labelFor(t.options.sessionTypes, fastestSession.type), formatDate(fastestSession.startedAt, locale), v.isFastest ? ts.fastest : null]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          icon="compare"
          title={ts.title}
          subtitle={format(ts.subtitle, { versions: plural(versions.length, ts.versions) })}
        />
        {kartName && (
          <span className="border border-zinc-800 px-2.5 py-2 font-mono text-xs tracking-wider uppercase">
            {kartName}
            {track && ` · ${track}`}
          </span>
        )}
      </div>

      {karts.length > 1 && (
        <nav aria-label="Kart" className="flex flex-wrap gap-1">
          {karts.map(([id, name]) => (
            <Link
              key={id}
              href={`/dashboard/setups?kart=${id}`}
              aria-current={id === kartId ? "page" : undefined}
              className={`inline-flex min-h-11 items-center border px-3 text-sm ${focusRing} ${
                id === kartId ? "border-brand-400 bg-brand-500 font-bold text-on-brand" : "border-zinc-800 text-zinc-300"
              }`}
            >
              {name}
            </Link>
          ))}
        </nav>
      )}

      {versions.length === 0 ? (
        <section className={cardClass}>
          <p className="text-zinc-300">{ts.empty}</p>
          <Link href="/dashboard/seasons" className={`${linkClass} mt-3 inline-block text-sm`}>
            {ts.toEvents}
          </Link>
        </section>
      ) : (
        <>
          <section aria-label={ts.treeLabel} className="crop border border-zinc-800 p-3">
            <SetupGraph versions={versions} ts={ts} />
          </section>

          <section aria-label={ts.versionsLabel} className="flex flex-col gap-px border border-zinc-800 bg-zinc-800">
            {newestFirst.map((v) => (
              <div key={v.id} className="flex flex-col gap-2 bg-zinc-950 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-baseline gap-2.5">
                    <span className={`font-mono text-[15px] font-bold ${v.isFastest ? "text-brand-300" : v.wet ? "text-ref" : "text-zinc-50"}`}>
                      {v.label}
                    </span>
                    <span className="truncate text-[13px] text-zinc-500">{meta(v)}</span>
                  </span>
                  <DeltaChip v={v} ts={ts} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {v.changes.length === 0 ? (
                    <span className="text-xs text-zinc-500">{ts.noChange}</span>
                  ) : (
                    v.changes.map((c) => (
                      <span key={c} className="border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs">
                        {c}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </section>

          {a && b && (
            <section aria-labelledby="compare-heading" className="border border-zinc-800">
              <form method="get" className="flex flex-wrap items-end gap-2 border-b border-zinc-800 px-4 py-3">
                <h2 id="compare-heading" className="channel-label mr-auto self-center">
                  {ts.compare}
                </h2>
                {kartId && <input type="hidden" name="kart" value={kartId} />}
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="sr-only">{ts.firstVersion}</span>
                  <select name="a" defaultValue={a.label} className={`${inputClass} h-11 w-24 font-mono`}>
                    {versions.map((v) => (
                      <option key={v.id}>{v.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="sr-only">{ts.secondVersion}</span>
                  <select name="b" defaultValue={b.label} className={`${inputClass} h-11 w-24 font-mono`}>
                    {versions.map((v) => (
                      <option key={v.id}>{v.label}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={secondaryButtonClass}>
                  {ts.compare}
                </button>
              </form>
              <div className="channel-label grid grid-cols-[1fr_80px_80px] border-b border-zinc-800 px-4 py-2.5">
                <span>{ts.setting}</span>
                <span className="text-right text-brand-300">{a.label.toUpperCase()}</span>
                <span className="text-right">{b.label.toUpperCase()}</span>
              </div>
              <ul>
                {rows.map((r) => (
                  <li
                    key={r.key}
                    className={`grid min-h-10 grid-cols-[1fr_80px_80px] items-center border-b border-zinc-800/60 px-4 last:border-b-0 ${r.changed ? "bg-brand-500/10" : ""}`}
                  >
                    <span className="text-sm">
                      {r.label}
                      {r.changed && <span className="sr-only"> {ts.changed}</span>}
                    </span>
                    <span className="text-right font-mono text-sm">{r.a}</span>
                    <span className={`text-right font-mono text-sm font-bold ${r.changed ? "text-brand-300" : ""}`}>{r.b}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
