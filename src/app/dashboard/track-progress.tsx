import Link from "next/link";

import { LapTimeChart } from "@/components/lap-time-chart";
import { cardClass, linkClass } from "@/components/ui";
import { formatDate, formatLapTime } from "@/lib/karting";
import { formatDelta } from "@/lib/lap-analysis";

export type ProgressSession = {
  best_lap_ms: number | null;
  events: { id: string; name: string; starts_on: string; tracks: { id: string; name: string } | null };
};

type EventBest = { id: string; name: string; startsOn: string; ms: number };

/** Fastest lap per event, grouped per track and sorted by date. */
function groupByTrack(sessions: ProgressSession[]) {
  const tracks = new Map<string, { name: string; events: Map<string, EventBest> }>();
  for (const session of sessions) {
    const track = session.events.tracks;
    if (!track || session.best_lap_ms === null) continue;
    const entry = tracks.get(track.id) ?? { name: track.name, events: new Map<string, EventBest>() };
    const current = entry.events.get(session.events.id);
    if (!current || session.best_lap_ms < current.ms) {
      entry.events.set(session.events.id, {
        id: session.events.id,
        name: session.events.name,
        startsOn: session.events.starts_on,
        ms: session.best_lap_ms,
      });
    }
    tracks.set(track.id, entry);
  }
  return [...tracks.entries()]
    .map(([id, { name, events }]) => ({
      id,
      name,
      events: [...events.values()].sort((a, b) => a.startsOn.localeCompare(b.startsOn)),
    }))
    .sort((a, b) => b.events.length - a.events.length || a.name.localeCompare(b.name));
}

const shortDate = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" });

/**
 * Small multiples: one chart per track. Lap times on different tracks are not comparable,
 * so each track gets its own scale rather than sharing one axis.
 */
export function TrackProgress({ sessions }: { sessions: ProgressSession[] }) {
  const tracks = groupByTrack(sessions);
  if (tracks.length === 0) return null;

  return (
    <section aria-labelledby="progress-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="progress-heading" className="text-lg font-semibold">
          Progressie per circuit
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Je snelste ronde per evenement · lager is sneller</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {tracks.map((track) => {
          const best = Math.min(...track.events.map((e) => e.ms));
          const first = track.events[0];
          const last = track.events.at(-1)!;
          const change = last.ms - first.ms;
          return (
            // min-w-0: let the grid column, not the chart's last measured width, decide the card's width.
            <article key={track.id} className={`${cardClass} min-w-0`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{track.name}</h3>
                <p className="text-xs text-zinc-500">
                  {track.events.length} {track.events.length === 1 ? "evenement" : "evenementen"} · snelste{" "}
                  <span className="text-zinc-300 tabular-nums">{formatLapTime(best)}</span>
                </p>
              </div>

              {track.events.length >= 2 ? (
                <>
                  <p className="mt-1 text-xs text-zinc-500">
                    {change < 0 ? "Sneller" : change > 0 ? "Trager" : "Gelijk"} sinds {formatDate(first.startsOn)}:{" "}
                    <span className="text-zinc-300 tabular-nums">{formatDelta(change)} s</span>
                  </p>
                  <div className="mt-4">
                    <LapTimeChart
                      label={`Snelste ronde per evenement op ${track.name}`}
                      points={track.events.map((event) => ({
                        key: event.id,
                        xLabel: shortDate.format(new Date(event.startsOn)),
                        ms: event.ms,
                        // Spaced by date, so a long break between events looks like one.
                        position: (Date.parse(event.startsOn) - Date.parse(first.startsOn)) / 86_400_000,
                        title: `${event.name} · ${formatDate(event.startsOn)}`,
                        detail: event.ms === best ? "snelste op dit circuit" : `${formatDelta(event.ms - best)} t.o.v. snelste`,
                      }))}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">
                  Na een tweede evenement op dit circuit zie je hier je progressie.
                </p>
              )}

              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">Als tabel</summary>
                <table className="mt-2 w-full text-left text-xs tabular-nums">
                  <tbody className="divide-y divide-zinc-800/80">
                    {track.events.map((event) => (
                      <tr key={event.id}>
                        <td className="py-1.5 pr-3 text-zinc-500">{formatDate(event.startsOn)}</td>
                        <td className="py-1.5 pr-3">
                          <Link href={`/dashboard/events/${event.id}`} className={linkClass}>
                            {event.name}
                          </Link>
                        </td>
                        <td className="py-1.5 text-right text-zinc-200">{formatLapTime(event.ms)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
