import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { sortByLabel } from "@/lib/karting";
import { findInsights, type Insight } from "@/lib/setup-advisor";

import { ExplainButton } from "./explain-button";
import { InsightList, NoInsights } from "./insight-list";
import { loadAdvisorSessions } from "./load";

export const metadata: Metadata = {
  title: "Advies voor setup — CorsaIQ",
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
      <p className="text-2xl font-semibold text-zinc-50 tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-400">{label}</p>
    </div>
  );
}

export default async function AdvicePage({ searchParams }: PageProps<"/dashboard/advice">) {
  const query = await searchParams;
  const trackId = typeof query.track === "string" ? query.track : null;
  const { supabase, garage } = await getCurrentGarage();

  const sessions = await loadAdvisorSessions(supabase, garage.id);
  const insights = findInsights(sessions);
  const tracks = sortByLabel(
    [...new Map(sessions.map((s) => [s.trackId, s.trackName])).entries()].map(([id, name]) => ({
      id,
      label: name,
      count: insights.filter((i) => i.trackId === id).length,
    })),
  );
  const shown = trackId ? insights.filter((i) => i.trackId === trackId) : insights;
  const shownSessions = trackId ? sessions.filter((s) => s.trackId === trackId) : sessions;
  const showKart = new Set(sessions.map((s) => s.kart?.id)).size > 1;

  // Per circuit, the circuit with the most findings first.
  const perTrack = [...shown.reduce((map, i) => map.set(i.trackId, [...(map.get(i.trackId) ?? []), i]), new Map<string, Insight[]>())].sort(
    (a, b) => b[1].length - a[1].length,
  );

  return (
    <>
      <PageHeader icon="target" title="Advies voor setup" subtitle="Verbanden tussen afstelling en rondetijd" />

      <section aria-label="Samenvatting" className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Sessies geanalyseerd" value={shownSessions.length} />
          <Stat label="Verbanden gevonden" value={shown.length} />
          <Stat label="Sterk of redelijk" value={shown.filter((i) => i.confidence !== "weak").length} />
        </div>
        <p className="text-xs text-zinc-500">
          Methode: sessies worden alleen vergeleken op hetzelfde circuit, met dezelfde kart en bij hetzelfde weer. Elke instelling moet in
          minstens twee sessies gereden zijn. De betrouwbaarheid hangt af van het aantal sessies en de spreiding in rondetijden. Gebruik
          de verbanden als testrichting, niet als garantie.
        </p>
      </section>

      {tracks.length > 1 && (
        <div role="group" aria-label="Circuit" className="flex flex-wrap gap-1.5">
          {[{ id: null, label: "Alle circuits", count: insights.length }, ...tracks].map((track) => {
            const active = track.id === trackId;
            return (
              <Link
                key={track.id ?? "all"}
                href={track.id ? `/dashboard/advice?track=${track.id}` : "/dashboard/advice"}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${focusRing} ${
                  active ? "border-zinc-600 bg-zinc-800 text-white" : "border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {track.label} <span className="text-zinc-500 tabular-nums">{track.count}</span>
              </Link>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <section className={cardClass}>
          <NoInsights />
        </section>
      ) : (
        <>
          <section aria-labelledby="analysis-heading" className={`${cardClass} border-brand-400/30`}>
            <h2 id="analysis-heading" className="text-lg font-semibold">
              Analyse en aanbeveling
            </h2>
            <p className="mt-1 mb-4 text-sm text-zinc-400">
              Een samenvatting van de belangrijkste verbanden, met een voorstel voor je volgende testsessie.
            </p>
            <ExplainButton key={trackId ?? "all"} trackId={trackId} />
          </section>
          {perTrack.map(([id, list]) => (
            <section key={id} aria-labelledby={`track-${id}`} className={cardClass}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`track-${id}`} className="text-lg font-semibold">
                  {list[0].trackName}
                </h2>
                <Link href={`/dashboard/tracks/${id}#setups`} className={`${linkClass} text-sm`}>
                  Setups bekijken
                </Link>
              </div>
              <div className="mt-2">
                <InsightList insights={list} showTrack={false} showKart={showKart} />
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
