// Every timed session on one circuit with its setup, fastest first, so you see which setup worked
// in which conditions. Cells that differ from the fastest session stand out.

import Link from "next/link";

import { cardClass, linkClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { formatDate, formatLapTime, labelFor, type SetupValues } from "@/lib/karting";
import { formatDelta } from "@/lib/lap-analysis";
import { SETUP_GROUPS, fieldsInUse, formatSetupValue, gearRatio, getSetupValue } from "@/lib/setup";

export type ComparedSession = {
  id: string;
  type: string;
  startsOn: string;
  eventName: string;
  kart: { id: string; name: string } | null;
  bestLapMs: number;
  conditions: { weather?: string; air_temp_c?: number; track_temp_c?: number };
  setup: SetupValues;
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";
const ratioFormat = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${focusRing} ${
        active ? "border-zinc-600 bg-zinc-800 text-white" : "border-zinc-800 text-zinc-400 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

export function SetupComparison({
  trackId,
  sessions,
  weather,
  kartId,
  t,
}: {
  trackId: string;
  sessions: ComparedSession[];
  weather: string | null;
  kartId: string | null;
  t: Dictionary;
}) {
  const karts = [...new Map(sessions.flatMap((s) => (s.kart ? [[s.kart.id, s.kart.name] as const] : []))).entries()];
  const weathers = [...new Set(sessions.map((s) => s.conditions.weather).filter((w): w is string => Boolean(w)))];
  const shown = sessions
    .filter((s) => (weather ? s.conditions.weather === weather : true) && (kartId ? s.kart?.id === kartId : true))
    .sort((a, b) => a.bestLapMs - b.bestLapMs);
  const reference = shown[0];
  const fields = fieldsInUse(shown.map((s) => s.setup));
  const showRatio = shown.some((s) => gearRatio(s.setup) !== null);

  const href = (next: { weather?: string | null; kart?: string | null }) => {
    const params = new URLSearchParams();
    const w = next.weather === undefined ? weather : next.weather;
    const k = next.kart === undefined ? kartId : next.kart;
    if (w) params.set("weather", w);
    if (k) params.set("kart", k);
    const query = params.toString();
    return `/dashboard/tracks/${trackId}${query ? `?${query}` : ""}#setups`;
  };

  return (
    <section id="setups" aria-labelledby="setups-heading" className={`${cardClass} scroll-mt-24`}>
      <h2 id="setups-heading" className="text-lg font-semibold">
        Setups op dit circuit
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Elke sessie met een rondetijd, snelste eerst. Wat anders was dan bij je snelste sessie staat vet.
      </p>

      {(weathers.length > 1 || karts.length > 1) && (
        <div className="mt-4 flex flex-col gap-2">
          {weathers.length > 1 && (
            <div role="group" aria-label="Weer" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 w-12 text-xs text-zinc-500">Weer</span>
              <FilterChip href={href({ weather: null })} active={!weather}>
                Alle
              </FilterChip>
              {weathers.map((w) => (
                <FilterChip key={w} href={href({ weather: w })} active={weather === w}>
                  {labelFor(t.options.weather, w)}
                </FilterChip>
              ))}
            </div>
          )}
          {karts.length > 1 && (
            <div role="group" aria-label="Kart" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 w-12 text-xs text-zinc-500">Kart</span>
              <FilterChip href={href({ kart: null })} active={!kartId}>
                Alle
              </FilterChip>
              {karts.map(([id, name]) => (
                <FilterChip key={id} href={href({ kart: id })} active={kartId === id}>
                  {name}
                </FilterChip>
              ))}
            </div>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">
          {sessions.length === 0 ? "Nog geen sessies met een rondetijd op dit circuit." : "Geen sessies met dit filter."}{" "}
          {(weather || kartId) && (
            <Link href={href({ weather: null, kart: null })} scroll={false} className={linkClass}>
              Filter wissen
            </Link>
          )}
        </p>
      ) : (
        <div className="relative mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-xs text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th scope="col" className="py-2 pr-4 font-medium">Sessie</th>
                <th scope="col" className="py-2 pr-4 font-medium">Omstandigheden</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Beste ronde</th>
                {fields.map((field) => (
                  <th key={field.name} scope="col" title={`${SETUP_GROUPS[field.group]}: ${field.label}`} className="py-2 pr-4 font-medium">
                    {field.short}
                  </th>
                ))}
                {showRatio && (
                  <th scope="col" title="Tandwiel achter gedeeld door voor" className="py-2 pr-4 font-medium">
                    Verhouding
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {shown.map((session) => {
                const isReference = session === reference;
                const c = session.conditions;
                const ratio = gearRatio(session.setup);
                const refRatio = gearRatio(reference.setup);
                return (
                  <tr key={session.id}>
                    <td className="py-2 pr-4">
                      <Link href={`/dashboard/sessions/${session.id}`} className={`text-zinc-100 hover:underline ${focusRing}`}>
                        {formatDate(session.startsOn)} · {labelFor(t.options.sessionTypes, session.type)}
                      </Link>
                      <span className="block text-xs text-zinc-500">
                        {session.eventName}
                        {session.kart && ` · ${session.kart.name}`}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-zinc-400">
                      {[
                        c.weather && labelFor(t.options.weather, c.weather),
                        c.air_temp_c !== undefined && `lucht ${c.air_temp_c}°`,
                        c.track_temp_c !== undefined && `baan ${c.track_temp_c}°`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      <span className={isReference ? "font-semibold text-brand-300" : "text-zinc-100"}>
                        {formatLapTime(session.bestLapMs)}
                      </span>
                      <span className="block text-xs text-zinc-500">
                        {isReference ? "snelste" : formatDelta(session.bestLapMs - reference.bestLapMs)}
                      </span>
                    </td>
                    {fields.map((field) => {
                      const value = getSetupValue(session.setup, field);
                      return (
                        <FieldCell
                          key={field.name}
                          changed={!isReference && value !== getSetupValue(reference.setup, field)}
                          value={formatSetupValue(field, value)}
                        />
                      );
                    })}
                    {showRatio && (
                      <FieldCell changed={!isReference && ratio !== refRatio} value={ratio === null ? "—" : ratioFormat.format(ratio)} />
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FieldCell({ changed, value }: { changed: boolean; value: string }) {
  return (
    <td className={`py-2 pr-4 tabular-nums ${changed ? "font-semibold text-white" : "text-zinc-400"}`}>
      {value}
      {changed && <span className="sr-only"> (anders dan snelste)</span>}
    </td>
  );
}
