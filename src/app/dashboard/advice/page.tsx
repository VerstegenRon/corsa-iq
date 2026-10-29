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
  title: "Afstelling-advies — CorsaIQ",
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

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
  const showKart = new Set(sessions.map((s) => s.kart?.id)).size > 1;

  // Per circuit, the circuit with the most findings first.
  const perTrack = [...shown.reduce((map, i) => map.set(i.trackId, [...(map.get(i.trackId) ?? []), i]), new Map<string, Insight[]>())].sort(
    (a, b) => b[1].length - a[1].length,
  );

  return (
    <>
      <PageHeader icon="target" title="Afstelling-advies" subtitle="Wat werkte er in je eigen sessies" />

      <section className={cardClass}>
        <p className="text-sm text-zinc-300">
          De app vergelijkt je sessies op hetzelfde circuit, met dezelfde kart en bij hetzelfde weer, en zoekt welke afstelling samenging
          met snellere beste rondes. Bij elk verband staat op hoeveel sessies het rust en hoe zeker het is. Het zijn aanwijzingen om te
          testen, geen garanties.
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
          <section aria-labelledby="explain-heading" className={cardClass}>
            <h2 id="explain-heading" className="mb-3 text-lg font-semibold">
              In gewone taal
            </h2>
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
