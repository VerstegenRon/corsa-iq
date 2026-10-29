import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate, formatLapTime, formatTime, labelFor } from "@/lib/karting";

export const metadata: Metadata = {
  title: "Analyse — CorsaIQ",
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

/** Sessions to analyse, newest first; each opens its laps, sectors and comparisons. */
export default async function AnalysePage() {
  const [{ supabase, garage }, t] = await Promise.all([getCurrentGarage(), getDictionary()]);
  const { data, error } = await supabase
    .from("sessions")
    .select("id, type, started_at, best_lap_ms, karts(name), drivers(name), laps!laps_session_id_fkey(id, lap_channels(lap_id)), events!inner(name, garage_id, tracks(name))")
    .eq("events.garage_id", garage.id)
    .order("started_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  const sessions = data ?? [];
  const best = Math.min(...sessions.map((s) => s.best_lap_ms ?? Infinity));

  return (
    <>
      <PageHeader icon="gauge" title="Waar zit de tijd?" subtitle="Analyse · kies een sessie" />

      {sessions.length === 0 ? (
        <section className={cardClass}>
          <p className="text-zinc-300">Nog geen rondes. Importeer je eerste logger-bestand bij een sessie.</p>
          <Link href="/dashboard/seasons" className={`${linkClass} mt-3 inline-block text-sm`}>
            Naar je evenementen
          </Link>
        </section>
      ) : (
        <section aria-label="Sessies" className="border border-zinc-800">
          <div className="channel-label grid grid-cols-[1fr_auto] gap-3 border-b border-zinc-800 px-4 py-2.5 sm:grid-cols-[1fr_6rem_6rem]">
            <span>Sessie</span>
            <span className="hidden text-right sm:block">Rondes</span>
            <span className="text-right">Snelste</span>
          </div>
          <ul>
            {sessions.map((s) => (
              <li key={s.id} className="border-b border-zinc-800/60 last:border-b-0">
                <Link
                  href={`/dashboard/sessions/${s.id}${s.laps.some((l) => l.lap_channels) ? "/analyse" : ""}`}
                  className={`grid min-h-14 grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-900 sm:grid-cols-[1fr_6rem_6rem] ${focusRing}`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold text-zinc-50">
                        {labelFor(t.options.sessionTypes, s.type)} · {s.events.name}
                      </span>
                      {s.laps.some((l) => l.lap_channels) && (
                        <span title="Met telemetrie" className="shrink-0 border border-brand-400 px-1 font-mono text-[10px] font-bold text-brand-300">
                          CH
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {formatDate(s.started_at)} {formatTime(s.started_at)}
                      {s.events.tracks && ` · ${s.events.tracks.name}`}
                      {s.karts && ` · ${s.karts.name}`}
                      {s.drivers && ` · ${s.drivers.name}`}
                    </span>
                  </span>
                  <span className="hidden text-right text-zinc-300 tabular-nums sm:block">{s.laps.length || "—"}</span>
                  <span
                    className={`text-right font-bold tabular-nums ${s.best_lap_ms !== null && s.best_lap_ms === best ? "text-brand-300" : "text-zinc-50"}`}
                  >
                    {formatLapTime(s.best_lap_ms)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
