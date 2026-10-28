import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { EditSection } from "@/components/edit-section";
import { LapTimeChart, type LapPoint } from "@/components/lap-time-chart";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import {
  SESSION_TYPES,
  WEATHER,
  formatDate,
  formatLapTime,
  formatMinutes,
  formatTime,
  labelFor,
  summarizeSetup,
  toLocalDateTimeInput,
  type SetupValues,
} from "@/lib/karting";
import { formatDelta, summarizeLaps, type StoredLap } from "@/lib/lap-analysis";

import { SessionForm } from "../../events/[id]/session-form";
import { deleteSession } from "../../season-actions";
import { LapImportForm } from "./lap-import-form";

export const metadata: Metadata = {
  title: "Sessie — CorsaIQ",
};

type Conditions = { weather?: string; air_temp_c?: number; track_temp_c?: number };

const SOURCE_LABELS: Record<string, string> = {
  aim: "AiM / MyChron",
  alfano: "Alfano",
  unipro: "Unipro",
  mychron_cloud: "MyChron cloud",
  csv: "CSV",
  manual: "handmatig",
};

export default async function SessionPage({ params }: PageProps<"/dashboard/sessions/[id]">) {
  const { id } = await params;
  const { supabase, garage } = await getCurrentGarage();

  const [sessionResult, driversResult] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "id, type, started_at, duration_s, best_lap_ms, driver_id, position, conditions, driver_feedback, events!inner(id, name, starts_on, garage_id), karts(name), drivers(name), setups(values), data_imports(source, created_at), laps(lap_number, lap_time_ms, is_valid, is_pit_lap, max_speed_kmh, max_rpm, lap_sectors(sector_number, sector_time_ms))",
      )
      .eq("id", id)
      .eq("events.garage_id", garage.id)
      .order("lap_number", { referencedTable: "laps" })
      .maybeSingle(),
    supabase.from("drivers").select("id, name").eq("garage_id", garage.id).order("created_at"),
  ]);
  if (sessionResult.error) throw new Error(sessionResult.error.message);
  const session = sessionResult.data;
  if (!session) notFound();

  const laps = session.laps.map((lap) => ({
    ...lap,
    sectors: [...lap.lap_sectors].sort((a, b) => a.sector_number - b.sector_number).map((s) => s.sector_time_ms),
  })) satisfies StoredLap[];
  const summary = summarizeLaps(laps);
  // The chart shows the laps that count; out laps and outliers would only flatten the line.
  const chartLaps = laps.filter((lap) => lap.is_valid && !lap.is_pit_lap);
  // A left-out lap breaks the line; any run of left-out laps adds only a sliver of room,
  // so the break shows without a hole in the chart.
  const chartPoints: LapPoint[] = [];
  for (const [i, lap] of chartLaps.entries()) {
    const previous = chartPoints.at(-1);
    const breakBefore = i > 0 && lap.lap_number !== chartLaps[i - 1].lap_number + 1;
    chartPoints.push({
      key: String(lap.lap_number),
      xLabel: String(lap.lap_number),
      ms: lap.lap_time_ms,
      position: previous ? previous.position! + (breakBefore ? 1.1 : 1) : 0,
      breakBefore,
      title: `Ronde ${lap.lap_number}`,
      detail:
        summary.bestMs !== null && lap.lap_time_ms !== summary.bestMs
          ? `${formatDelta(lap.lap_time_ms - summary.bestMs)} t.o.v. snelste`
          : "snelste ronde",
    });
  }
  const hiddenLaps = laps.length - chartLaps.length;
  const sectorCount = Math.max(0, ...laps.map((lap) => lap.sectors.length));
  const hasSpeed = laps.some((lap) => lap.max_speed_kmh !== null);
  const hasRpm = laps.some((lap) => lap.max_rpm !== null);
  const conditions = session.conditions as Conditions;
  const setup = summarizeSetup((session.setups?.values ?? {}) as SetupValues);

  const stats = [
    { label: "Snelste ronde", value: formatLapTime(summary.bestMs), note: summary.bestLapNumber !== null ? `ronde ${summary.bestLapNumber}` : null },
    { label: "Gemiddelde", value: formatLapTime(summary.averageMs), note: summary.validCount > 0 ? `${summary.validCount} geldige ronden` : null },
    { label: "Spreiding", value: summary.spreadMs === null ? "—" : `±${(summary.spreadMs / 1000).toFixed(3)}`, note: "lager is constanter" },
    {
      label: "Ideale ronde",
      value: formatLapTime(summary.theoreticalBestMs),
      note:
        summary.theoreticalBestMs !== null && summary.bestMs !== null
          ? `${formatDelta(summary.theoreticalBestMs - summary.bestMs)} t.o.v. snelste`
          : "beste sectoren samen",
    },
  ];

  return (
    <>
      <section>
        <Link href={`/dashboard/events/${session.events.id}`} className={`${linkClass} text-sm`}>
          ← {session.events.name}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{labelFor(SESSION_TYPES, session.type)}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {formatDate(session.events.starts_on)} · {formatTime(session.started_at)} · {session.karts?.name} ·{" "}
          {session.drivers?.name} · {formatMinutes(Math.round((session.duration_s ?? 0) / 60))}
          {conditions.weather && ` · ${labelFor(WEATHER, conditions.weather)}`}
          {session.position !== null && ` · P${session.position}`}
        </p>
        {setup.length > 0 && <p className="mt-1 text-xs text-zinc-500">{setup.join(" · ")}</p>}
        {session.driver_feedback && <p className="mt-3 text-sm text-zinc-300 italic">“{session.driver_feedback}”</p>}
      </section>

      <section aria-label="Analyse" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={cardClass}>
            <p className="text-sm text-zinc-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{stat.value}</p>
            {stat.note && <p className="mt-1 text-xs text-zinc-500">{stat.note}</p>}
          </div>
        ))}
      </section>

      {laps.length > 0 && (
        <section aria-labelledby="laps-heading" className={cardClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="laps-heading" className="text-lg font-semibold">
              Ronden
            </h2>
            {session.data_imports && (
              <p className="text-xs text-zinc-500">
                Geïmporteerd ({SOURCE_LABELS[session.data_imports.source] ?? session.data_imports.source}) op{" "}
                {formatDate(session.data_imports.created_at)}
              </p>
            )}
          </div>
          {chartPoints.length >= 2 && (
            <div className="mt-6">
              <p className="mb-2 text-xs text-zinc-500">
                Rondetijd per ronde · lager is sneller
                {hiddenLaps > 0 && ` · ${hiddenLaps} ${hiddenLaps === 1 ? "ronde telt" : "ronden tellen"} niet mee en ${hiddenLaps === 1 ? "staat" : "staan"} alleen in de tabel`}
              </p>
              <LapTimeChart points={chartPoints} label="Rondetijd per ronde" />
            </div>
          )}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-zinc-400">
                <tr className="border-b border-zinc-800">
                  <th className="py-2 pr-4 font-medium">Ronde</th>
                  <th className="py-2 pr-4 font-medium">Tijd</th>
                  <th className="py-2 pr-4 font-medium">Verschil</th>
                  {Array.from({ length: sectorCount }, (_, i) => (
                    <th key={i} className="py-2 pr-4 font-medium">
                      S{i + 1}
                    </th>
                  ))}
                  {hasSpeed && <th className="py-2 pr-4 font-medium">Top km/u</th>}
                  {hasRpm && <th className="py-2 pr-4 font-medium">Max toeren</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {laps.map((lap) => {
                  const counts = lap.is_valid && !lap.is_pit_lap;
                  const isBest = counts && lap.lap_time_ms === summary.bestMs;
                  return (
                    <tr key={lap.lap_number} className={counts ? "" : "text-zinc-500"}>
                      <td className="py-2 pr-4">{lap.lap_number}</td>
                      <td className={`py-2 pr-4 font-medium ${isBest ? "text-cyan-300" : ""}`}>
                        {formatLapTime(lap.lap_time_ms)}
                        {!counts && <span className="ml-2 text-xs font-normal">telt niet mee</span>}
                      </td>
                      <td className="py-2 pr-4 text-zinc-400">
                        {summary.bestMs !== null && !isBest && counts ? formatDelta(lap.lap_time_ms - summary.bestMs) : ""}
                      </td>
                      {Array.from({ length: sectorCount }, (_, i) => {
                        const sector = lap.sectors[i];
                        const isBestSector = counts && sector !== undefined && sector === summary.bestSectors[i];
                        return (
                          <td key={i} className={`py-2 pr-4 ${isBestSector ? "text-cyan-300" : ""}`}>
                            {sector === undefined ? "—" : formatLapTime(sector)}
                          </td>
                        );
                      })}
                      {hasSpeed && <td className="py-2 pr-4">{lap.max_speed_kmh ?? "—"}</td>}
                      {hasRpm && <td className="py-2 pr-4">{lap.max_rpm ?? "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sectorCount > 0 && <p className="mt-3 text-xs text-zinc-500">Snelste ronde en snelste sectoren in cyaan.</p>}
        </section>
      )}

      <section aria-labelledby="import-heading" className={cardClass}>
        <h2 id="import-heading" className="text-lg font-semibold">
          {laps.length > 0 ? "Ronden opnieuw importeren" : "Rondetijden toevoegen"}
        </h2>
        <p className="mt-2 mb-6 text-sm text-zinc-400">
          Upload een CSV-export van je datalogger (AiM Race Studio, Alfano, Unipro) of een uitslag van de baan, of plak
          de tijden. Je ziet eerst een voorvertoning.
        </p>
        <LapImportForm sessionId={session.id} garageId={garage.id} hasLaps={laps.length > 0} />
      </section>

      <EditSection
        title="Sessie bewerken"
        danger={
          <DeleteButton
            action={deleteSession.bind(null, session.id)}
            label="Sessie verwijderen"
            confirmText={`Deze sessie verwijderen?${laps.length > 0 ? ` De ${laps.length} ronden gaan ook weg.` : ""} Draaiuren van de onderdelen tellen daarna niet meer mee.`}
          />
        }
      >
        <SessionForm
          eventId={session.events.id}
          eventDate={session.events.starts_on}
          karts={[]}
          drivers={(driversResult.data ?? []).map((d) => ({ id: d.id, label: d.name }))}
          lastSetup={null}
          session={{
            id: session.id,
            type: session.type,
            kartName: session.karts?.name ?? "—",
            driverId: session.driver_id,
            startedLocal: toLocalDateTimeInput(session.started_at),
            durationMin: Math.round(((session.duration_s ?? 0) / 60) * 10) / 10,
            bestLap: session.best_lap_ms === null ? null : formatLapTime(session.best_lap_ms),
            hasLaps: laps.length > 0,
            position: session.position,
            conditions,
            driverFeedback: session.driver_feedback,
            setup: (session.setups?.values ?? {}) as SetupValues,
          }}
        />
      </EditSection>
    </>
  );
}
