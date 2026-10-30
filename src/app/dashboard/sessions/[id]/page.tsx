import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { EditSection } from "@/components/edit-section";
import { FeedbackTags } from "@/components/feedback-tags";
import { LapTimeChart, type LapPoint } from "@/components/lap-time-chart";
import { cardClass, linkClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { format, plural } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import {
  formatDate,
  formatLapTime,
  formatMinutes,
  formatTime,
  labelFor,
  summarizeSetup,
  toLocalDateTimeInput,
  type SetupValues,
} from "@/lib/karting";
import { parseFeedbackTags } from "@/lib/feedback";
import { formatDelta, summarizeLaps, type EngineLap } from "@/lib/lap-analysis";
import { weatherText, type SessionConditions } from "@/lib/weather";

import { SessionForm } from "../../events/[id]/session-form";
import { deleteSession } from "../../season-actions";
import { FeedbackCard } from "./feedback-card";
import { EngineAnalysis, SectorAnalysis, SessionComparison, StintAnalysis } from "./lap-insights";
import { LapImportForm } from "./lap-import-form";
import { SetupSection, sessionLabel, type SetupSessionInfo } from "./setup-section";

type LapRow = {
  lap_number: number;
  lap_time_ms: number;
  is_valid: boolean;
  is_pit_lap: boolean;
  max_speed_kmh: number | null;
  max_rpm: number | null;
  lap_sectors: { sector_number: number; sector_time_ms: number }[];
};

function toLaps(rows: LapRow[]): EngineLap[] {
  return rows.map((lap) => ({
    ...lap,
    max_speed_kmh: lap.max_speed_kmh === null ? null : Number(lap.max_speed_kmh),
    sectors: [...lap.lap_sectors].sort((a, b) => a.sector_number - b.sector_number).map((s) => s.sector_time_ms),
  }));
}

const LAP_SELECT = "lap_number, lap_time_ms, is_valid, is_pit_lap, max_speed_kmh, max_rpm, lap_sectors(sector_number, sector_time_ms)";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).session.metaTitle };
}

type Conditions = SessionConditions;

const SOURCE_LABELS: Record<string, string> = {
  aim: "AiM / MyChron",
  alfano: "Alfano",
  unipro: "Unipro",
  mychron_cloud: "MyChron cloud",
  csv: "CSV",
};

const COMPARE_SELECT =
  "id, type, started_at, best_lap_ms, conditions, kart_id, karts(name), setups(values), events!inner(starts_on, track_id, garage_id)";

type CompareRow = {
  id: string;
  type: string;
  started_at: string;
  best_lap_ms: number | null;
  conditions: unknown;
  karts: { name: string } | null;
  setups: { values: unknown } | null;
  events: { starts_on: string };
};

function toSetupInfo(row: CompareRow): SetupSessionInfo {
  return {
    id: row.id,
    type: row.type,
    startsOn: row.events.starts_on,
    startedAt: row.started_at,
    kartName: row.karts?.name ?? null,
    bestLapMs: row.best_lap_ms,
    conditions: (row.conditions ?? {}) as Conditions,
    setup: (row.setups?.values ?? {}) as SetupValues,
  };
}

export default async function SessionPage({ params, searchParams }: PageProps<"/dashboard/sessions/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const vs = typeof query.vs === "string" ? query.vs : null;
  const { supabase, garage, canEdit } = await getCurrentGarage();
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const ts = t.session;

  const [sessionResult, driversResult] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "id, type, started_at, duration_s, best_lap_ms, driver_id, kart_id, position, conditions, driver_feedback, feedback_tags, events!inner(id, name, starts_on, track_id, garage_id, tracks(latitude, longitude)), karts(name), drivers(name), setups(values), data_imports(source, created_at), laps!laps_session_id_fkey(lap_number, lap_time_ms, is_valid, is_pit_lap, max_speed_kmh, max_rpm, lap_sectors(sector_number, sector_time_ms))",
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

  // Sessions to compare the setup with: the same kart, and anything on the same circuit.
  const [sameKart, sameTrack] = await Promise.all([
    supabase
      .from("sessions")
      .select(COMPARE_SELECT)
      .eq("kart_id", session.kart_id)
      .eq("events.garage_id", garage.id)
      .neq("id", session.id)
      .order("started_at", { ascending: false })
      .limit(30),
    session.events.track_id
      ? supabase
          .from("sessions")
          .select(COMPARE_SELECT)
          .eq("events.track_id", session.events.track_id)
          .eq("events.garage_id", garage.id)
          .neq("id", session.id)
          .order("started_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as CompareRow[] }),
  ]);
  const candidateRows = [...new Map([...(sameKart.data ?? []), ...(sameTrack.data ?? [])].map((row) => [row.id, row])).values()].sort((a, b) =>
    b.started_at.localeCompare(a.started_at),
  );
  // Default: the kart's previous session, else the latest one on this circuit.
  const defaultRow = (sameKart.data ?? []).find((row) => row.started_at < session.started_at) ?? (sameTrack.data ?? [])[0] ?? null;
  const compareRow = (vs && candidateRows.find((row) => row.id === vs)) || defaultRow;

  const laps = toLaps(session.laps);
  const compareLaps = compareRow
    ? await supabase
        .from("laps")
        .select(LAP_SELECT)
        .eq("session_id", compareRow.id)
        .order("lap_number")
        .then(({ data, error }) => {
          if (error) throw new Error(error.message);
          return toLaps(data);
        })
    : null;
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
      title: format(ts.lap, { lap: lap.lap_number }),
      detail:
        summary.bestMs !== null && lap.lap_time_ms !== summary.bestMs
          ? format(ts.vsFastest, { delta: formatDelta(lap.lap_time_ms - summary.bestMs) })
          : ts.fastestLap,
    });
  }
  const hiddenLaps = laps.length - chartLaps.length;
  const sectorCount = Math.max(0, ...laps.map((lap) => lap.sectors.length));
  const hasSpeed = laps.some((lap) => lap.max_speed_kmh !== null);
  const hasRpm = laps.some((lap) => lap.max_rpm !== null);
  const { count: telemetryCount } = await supabase
    .from("lap_channels")
    .select("lap_id, laps!inner(session_id)", { count: "exact", head: true })
    .eq("laps.session_id", session.id);
  const hasTelemetry = (telemetryCount ?? 0) > 0;
  const conditions = session.conditions as Conditions;
  const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const weatherLine = [
    conditions.air_temp_c !== undefined && format(ts.air, { temp: decimal.format(conditions.air_temp_c) }),
    conditions.track_temp_c !== undefined && format(ts.track, { temp: decimal.format(conditions.track_temp_c) }),
    conditions.humidity_pct !== undefined && format(ts.humidity, { pct: conditions.humidity_pct }),
    conditions.precipitation_mm !== undefined && format(ts.rain, { mm: decimal.format(conditions.precipitation_mm) }),
  ].filter((part): part is string => Boolean(part));
  const setup = summarizeSetup((session.setups?.values ?? {}) as SetupValues);

  const stats = [
    {
      label: ts.best,
      value: formatLapTime(summary.bestMs),
      note: summary.bestLapNumber !== null ? format(ts.bestNote, { lap: summary.bestLapNumber }) : null,
    },
    { label: ts.average, value: formatLapTime(summary.averageMs), note: summary.validCount > 0 ? plural(summary.validCount, ts.validLaps) : null },
    { label: ts.spread, value: summary.spreadMs === null ? "—" : `±${(summary.spreadMs / 1000).toFixed(3)}`, note: ts.spreadNote },
    {
      label: ts.ideal,
      value: formatLapTime(summary.theoreticalBestMs),
      note:
        summary.theoreticalBestMs !== null && summary.bestMs !== null
          ? format(ts.vsFastest, { delta: formatDelta(summary.theoreticalBestMs - summary.bestMs) })
          : ts.idealNote,
    },
  ];

  return (
    <>
      <section>
        <Link href={`/dashboard/events/${session.events.id}`} className={`${linkClass} text-sm`}>
          ← {session.events.name}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{labelFor(t.options.sessionTypes, session.type)}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {formatDate(session.events.starts_on, locale)} ·{formatTime(session.started_at)} · {session.karts?.name} · {session.drivers?.name} ·{" "}
          {formatMinutes(Math.round((session.duration_s ?? 0) / 60))}
          {conditions.weather && ` · ${weatherText(conditions, t.options.weather)}`}
          {session.position !== null && ` · P${session.position}`}
        </p>
        {weatherLine.length > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            {weatherLine.join(" · ")}
            {conditions.auto &&
              conditions.auto.length > 0 &&
              ` · ${format(ts.autoWeather, { fields: conditions.auto.map((f) => ts.autoFields[f as keyof typeof ts.autoFields] ?? f).join(", ") })}`}
          </p>
        )}
        {setup.length > 0 && <p className="mt-1 text-xs text-zinc-500">{setup.join(" · ")}</p>}
      </section>

      <section aria-label={ts.statsLabel} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={cardClass}>
            <p className="text-sm text-zinc-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{stat.value}</p>
            {stat.note && <p className="mt-1 text-xs text-zinc-500">{stat.note}</p>}
          </div>
        ))}
      </section>

      {(hasTelemetry || canEdit) && (
        <section aria-label={ts.telemetry} className="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 px-5 py-4">
          <p className="text-sm text-zinc-300">{hasTelemetry ? ts.telemetryHas : ts.telemetryNone}</p>
          <Link href={`/dashboard/sessions/${session.id}/analyse`} className={hasTelemetry ? primaryButtonClass : secondaryButtonClass}>
            {hasTelemetry ? ts.telemetryOpen : ts.telemetryImport}
          </Link>
        </section>
      )}

      <FeedbackCard
        sessionId={session.id}
        feedback={session.driver_feedback}
        quick={parseFeedbackTags(session.feedback_tags)?.quick ?? []}
        tags={<FeedbackTags tags={parseFeedbackTags(session.feedback_tags)} t={t} className="mt-4" />}
      />

      {laps.length > 0 && (
        <section aria-labelledby="laps-heading" className={cardClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="laps-heading" className="text-lg font-semibold">
              {ts.laps}
            </h2>
            {session.data_imports && (
              <p className="text-xs text-zinc-500">
                {format(ts.imported, {
                  source:
                    session.data_imports.source === "manual"
                      ? ts.manual
                      : (SOURCE_LABELS[session.data_imports.source] ?? session.data_imports.source),
                  date: formatDate(session.data_imports.created_at, locale),
                })}
              </p>
            )}
          </div>
          {chartPoints.length >= 2 && (
            <div className="mt-6">
              <p className="mb-2 text-xs text-zinc-500">
                {ts.chartCaption}
                {hiddenLaps > 0 && ` · ${plural(hiddenLaps, ts.hiddenLaps)}`}
              </p>
              <LapTimeChart points={chartPoints} label={ts.chartLabel} />
            </div>
          )}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-zinc-400">
                <tr className="border-b border-zinc-800">
                  <th className="py-2 pr-4 font-medium">{ts.colLap}</th>
                  <th className="py-2 pr-4 font-medium">{ts.colTime}</th>
                  <th className="py-2 pr-4 font-medium">{ts.colDelta}</th>
                  {Array.from({ length: sectorCount }, (_, i) => (
                    <th key={i} className="py-2 pr-4 font-medium">
                      S{i + 1}
                    </th>
                  ))}
                  {hasSpeed && <th className="py-2 pr-4 font-medium">{ts.colTopSpeed}</th>}
                  {hasRpm && <th className="py-2 pr-4 font-medium">{ts.colMaxRpm}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {laps.map((lap) => {
                  const counts = lap.is_valid && !lap.is_pit_lap;
                  const isBest = counts && lap.lap_time_ms === summary.bestMs;
                  return (
                    <tr key={lap.lap_number} className={counts ? "" : "text-zinc-500"}>
                      <td className="py-2 pr-4">{lap.lap_number}</td>
                      <td className={`py-2 pr-4 font-medium ${isBest ? "text-brand-300" : ""}`}>
                        {formatLapTime(lap.lap_time_ms)}
                        {!counts && <span className="ml-2 text-xs font-normal">{ts.notCounted}</span>}
                      </td>
                      <td className="py-2 pr-4 text-zinc-400">
                        {summary.bestMs !== null && !isBest && counts ? formatDelta(lap.lap_time_ms - summary.bestMs) : ""}
                      </td>
                      {Array.from({ length: sectorCount }, (_, i) => {
                        const sector = lap.sectors[i];
                        const isBestSector = counts && sector !== undefined && sector === summary.bestSectors[i];
                        return (
                          <td key={i} className={`py-2 pr-4 ${isBestSector ? "text-brand-300" : ""}`}>
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
          {sectorCount > 0 && <p className="mt-3 text-xs text-zinc-500">{ts.highlighted}</p>}
        </section>
      )}

      {laps.length > 0 && (
        <>
          <div className={`grid grid-cols-1 gap-4 lg:gap-6 ${sectorCount > 0 ? "lg:grid-cols-2" : ""}`}>
            <SectorAnalysis laps={laps} t={t} />
            <StintAnalysis laps={laps} t={t} />
          </div>
          <EngineAnalysis laps={laps} t={t} locale={locale} />
          <SessionComparison
            t={t}
            laps={laps}
            compareLaps={compareLaps}
            compareId={compareRow?.id ?? null}
            compareLabel={compareRow ? sessionLabel(toSetupInfo(compareRow), t, locale) : null}
            candidates={candidateRows.map((row) => ({ id: row.id, label: sessionLabel(toSetupInfo(row), t, locale) }))}
          />
        </>
      )}

      <SetupSection
        session={toSetupInfo({ ...session, events: session.events })}
        candidates={candidateRows.map(toSetupInfo)}
        compareWith={compareRow ? toSetupInfo(compareRow) : null}
        t={t}
        locale={locale}
        showPicker={laps.length === 0}
      />

      {canEdit && (
        <section aria-labelledby="import-heading" className={cardClass}>
          <h2 id="import-heading" className="text-lg font-semibold">
            {laps.length > 0 ? ts.reimport : ts.addLaps}
          </h2>
          <p className="mt-2 mb-6 text-sm text-zinc-400">{ts.importIntro}</p>
          <LapImportForm sessionId={session.id} garageId={garage.id} hasLaps={laps.length > 0} />
        </section>
      )}

      <EditSection
        title={ts.edit}
        danger={
          <DeleteButton
            action={deleteSession.bind(null, session.id)}
            label={ts.delete}
            confirmText={[ts.deleteConfirm, laps.length > 0 && plural(laps.length, ts.deleteLaps), ts.deleteHours].filter(Boolean).join(" ")}
          />
        }
      >
        <SessionForm
          eventId={session.events.id}
          eventDate={session.events.starts_on}
          karts={[]}
          drivers={(driversResult.data ?? []).map((d) => ({ id: d.id, label: d.name }))}
          lastSetup={null}
          autoWeather={session.events.tracks?.latitude != null && session.events.tracks.longitude != null}
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
