// Deeper lap analysis on the session page: where the time goes per sector, how each stint
// developed, top speed and revs per lap, and the laps next to another session.

import { LapTimeChart, type ChartKind, type LapPoint } from "@/components/lap-time-chart";
import { Icon } from "@/components/icons";
import { cardClass, inputClass, secondaryButtonClass } from "@/components/ui";
import { formatLapTime } from "@/lib/karting";
import {
  analyzeEngine,
  analyzeSectors,
  countingLaps,
  formatDelta,
  splitStints,
  summarizeLaps,
  type EngineLap,
  type Stint,
} from "@/lib/lap-analysis";

/** Below this a stint's trend is noise, not tyre wear or a driver finding pace. */
const STEADY_TREND_MS = 20;

function seconds(ms: number) {
  return (ms / 1000).toFixed(3);
}

function SectionHeading({ id, icon, title, intro }: { id: string; icon: Parameters<typeof Icon>[0]["name"]; title: string; intro?: string }) {
  return (
    <div>
      <h2 id={id} className="flex items-center gap-2 text-lg font-semibold">
        <Icon name={icon} className="size-5 text-brand-300" />
        {title}
      </h2>
      {intro && <p className="mt-1 text-sm text-zinc-400">{intro}</p>}
    </div>
  );
}

export function SectorAnalysis({ laps }: { laps: EngineLap[] }) {
  const sectors = analyzeSectors(laps);
  if (sectors.length === 0) return null;
  const maxLoss = Math.max(...sectors.map((s) => s.lossMs), 1);
  const worst = sectors.reduce((a, b) => (b.lossMs > a.lossMs ? b : a));

  return (
    <section aria-labelledby="sectors-heading" className={cardClass}>
      <SectionHeading
        id="sectors-heading"
        icon="target"
        title="Waar zit de tijd?"
        intro="Per sector hoeveel je gemiddeld verliest op je eigen beste tijd daar. De langste balk is de sector om aan te werken."
      />
      <ul className="mt-5 flex flex-col gap-3">
        {sectors.map((sector) => {
          const isWorst = sector === worst && sector.lossMs > 0;
          return (
            <li key={sector.sector} className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-sm">
              <span className={`font-semibold ${isWorst ? "text-brand-200" : "text-zinc-300"}`}>S{sector.sector}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${isWorst ? "bg-brand-400" : "bg-zinc-500"}`}
                  style={{ width: `${Math.max((sector.lossMs / maxLoss) * 100, 2)}%` }}
                />
              </div>
              <span className={`text-right tabular-nums ${isWorst ? "font-semibold text-zinc-100" : "text-zinc-400"}`}>
                {formatDelta(sector.lossMs)}
              </span>
            </li>
          );
        })}
      </ul>
      <table className="mt-6 w-full text-sm tabular-nums">
        <caption className="sr-only">Sectortijden: beste, gemiddeld, verlies en spreiding</caption>
        <thead className="text-left text-xs text-zinc-400">
          <tr className="border-b border-zinc-800">
            <th scope="col" className="py-2 pr-3 font-medium">Sector</th>
            <th scope="col" className="py-2 pr-3 font-medium">Beste</th>
            <th scope="col" className="py-2 pr-3 font-medium">Gemiddeld</th>
            <th scope="col" className="py-2 pr-3 font-medium">Verlies</th>
            <th scope="col" className="py-2 font-medium">Spreiding</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80">
          {sectors.map((sector) => (
            <tr key={sector.sector}>
              <th scope="row" className="py-2 pr-3 text-left font-medium">S{sector.sector}</th>
              <td className="py-2 pr-3">{formatLapTime(sector.bestMs)}</td>
              <td className="py-2 pr-3">{formatLapTime(sector.averageMs)}</td>
              <td className="py-2 pr-3">{formatDelta(sector.lossMs)}</td>
              <td className="py-2 text-zinc-400">{sector.spreadMs === null ? "—" : `±${seconds(sector.spreadMs)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {worst.lossMs > 0 && (
        <p className="mt-4 text-sm text-zinc-300">
          In <span className="font-semibold text-zinc-100">sector {worst.sector}</span> laat je gemiddeld{" "}
          <span className="font-semibold text-zinc-100 tabular-nums">{seconds(worst.lossMs)} s</span> per ronde liggen.
        </p>
      )}
    </section>
  );
}

function trendText(stint: Stint) {
  if (stint.trendMsPerLap === null) return { text: "te kort", tone: "text-zinc-500" };
  if (Math.abs(stint.trendMsPerLap) < STEADY_TREND_MS) return { text: "stabiel", tone: "text-zinc-300" };
  const amount = `${seconds(Math.abs(stint.trendMsPerLap))} s/ronde`;
  return stint.trendMsPerLap > 0
    ? { text: `▲ ${amount} trager`, tone: "text-amber-300" }
    : { text: `▼ ${amount} sneller`, tone: "text-zinc-100" };
}

export function StintAnalysis({ laps }: { laps: EngineLap[] }) {
  const stints = splitStints(laps).filter((stint) => stint.validCount > 0);
  if (stints.length === 0) return null;

  return (
    <section aria-labelledby="stints-heading" className={cardClass}>
      <SectionHeading
        id="stints-heading"
        icon="flag"
        title={stints.length === 1 ? "Verloop van de sessie" : "Stints"}
        intro={
          stints.length === 1
            ? "Hoe constant je reed en of de tijden in de loop van de sessie opliepen of zakten."
            : "Een stint loopt van pitstop tot pitstop. Per stint je constantheid en of de tijden opliepen (bandenslijtage) of zakten."
        }
      />
      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stints.map((stint) => {
          const trend = trendText(stint);
          return (
            <li key={stint.index} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{stints.length === 1 ? "Hele sessie" : `Stint ${stint.index}`}</h3>
                <span className="text-xs text-zinc-500 tabular-nums">
                  ronde {stint.firstLap}–{stint.lastLap}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">Snelste</dt>
                  <dd className="font-semibold tabular-nums">{formatLapTime(stint.bestMs)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Gemiddeld</dt>
                  <dd className="tabular-nums">{formatLapTime(stint.averageMs)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Spreiding</dt>
                  <dd className="tabular-nums">{stint.spreadMs === null ? "—" : `±${seconds(stint.spreadMs)}`}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Trend</dt>
                  <dd className={`tabular-nums ${trend.tone}`}>{trend.text}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-zinc-500">
                {stint.validCount} {stint.validCount === 1 ? "geldige ronde" : "geldige ronden"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function lapPoints(laps: EngineLap[], value: (lap: EngineLap) => number | null, unit: string): LapPoint[] {
  return countingLaps(laps)
    .filter((lap) => value(lap) !== null)
    .map((lap, i, all) => ({
      key: String(lap.lap_number),
      xLabel: String(lap.lap_number),
      ms: value(lap)!,
      position: lap.lap_number,
      breakBefore: i > 0 && lap.lap_number !== all[i - 1].lap_number + 1,
      title: `Ronde ${lap.lap_number}`,
      detail: `${formatLapTime(lap.lap_time_ms)} rondetijd${unit ? ` · ${unit}` : ""}`,
    }));
}

const rpmFormat = new Intl.NumberFormat("nl-NL");

export function EngineAnalysis({ laps }: { laps: EngineLap[] }) {
  const stats = analyzeEngine(laps);
  if (stats.topSpeedKmh === null && stats.maxRpm === null) return null;
  const speedPoints = lapPoints(laps, (lap) => (lap.max_speed_kmh === null ? null : Number(lap.max_speed_kmh)), "km/u");
  const rpmPoints = lapPoints(laps, (lap) => lap.max_rpm, "toeren");

  const tiles: { label: string; value: string; note: string }[] = [];
  if (stats.topSpeedKmh !== null) {
    tiles.push({ label: "Topsnelheid", value: `${stats.topSpeedKmh} km/u`, note: `gemiddeld ${stats.averageTopSpeedKmh} km/u per ronde` });
    if (stats.bestLapSpeedKmh !== null) {
      const gap = Math.round((stats.topSpeedKmh - stats.bestLapSpeedKmh) * 10) / 10;
      tiles.push({
        label: "In je snelste ronde",
        value: `${stats.bestLapSpeedKmh} km/u`,
        note: gap === 0 ? "ook je topsnelheid" : `${gap} km/u onder je top`,
      });
    }
  }
  if (stats.maxRpm !== null) {
    tiles.push({ label: "Max toeren", value: rpmFormat.format(stats.maxRpm), note: `gemiddeld ${rpmFormat.format(stats.averageMaxRpm!)} per ronde` });
  }

  const charts: { kind: ChartKind; title: string; points: LapPoint[] }[] = [
    { kind: "speed", title: "Topsnelheid per ronde (km/u)", points: speedPoints },
    { kind: "rpm", title: "Max toeren per ronde", points: rpmPoints },
  ];

  return (
    <section aria-labelledby="engine-heading" className={cardClass}>
      <SectionHeading
        id="engine-heading"
        icon="gauge"
        title="Snelheid en toeren"
        intro="Uit je datalogger. Een lagere topsnelheid in je snelste ronde betekent dat je de tijd in de bochten wint, niet op het rechte stuk."
      />
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <dt className="text-xs text-zinc-500">{tile.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{tile.value}</dd>
            <dd className="mt-0.5 text-xs text-zinc-500 tabular-nums">{tile.note}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {charts
          .filter((chart) => chart.points.length >= 2)
          .map((chart) => (
            <div key={chart.kind} className="min-w-0">
              <p className="mb-2 text-xs text-zinc-500">{chart.title} · hoger is meer</p>
              <LapTimeChart points={chart.points} label={chart.title} kind={chart.kind} />
            </div>
          ))}
      </div>
    </section>
  );
}

export type CompareCandidate = { id: string; label: string };

export function SessionComparison({
  laps,
  compareLaps,
  compareId,
  compareLabel,
  candidates,
}: {
  laps: EngineLap[];
  compareLaps: EngineLap[] | null;
  compareId: string | null;
  compareLabel: string | null;
  candidates: CompareCandidate[];
}) {
  if (candidates.length === 0) return null;
  const mine = summarizeLaps(laps);
  const theirs = compareLaps ? summarizeLaps(compareLaps) : null;
  const hasComparison = theirs !== null && theirs.validCount > 0 && mine.validCount > 0;

  const rows = hasComparison
    ? [
        { label: "Snelste ronde", mine: mine.bestMs, theirs: theirs.bestMs, format: formatLapTime },
        { label: "Gemiddelde", mine: mine.averageMs, theirs: theirs.averageMs, format: formatLapTime },
        { label: "Spreiding", mine: mine.spreadMs, theirs: theirs.spreadMs, format: (ms: number | null) => (ms === null ? "—" : `±${seconds(ms)}`) },
        { label: "Ideale ronde", mine: mine.theoreticalBestMs, theirs: theirs.theoreticalBestMs, format: formatLapTime },
        ...(mine.bestSectors.length > 0 && mine.bestSectors.length === theirs.bestSectors.length
          ? mine.bestSectors.map((ms, i) => ({ label: `Beste S${i + 1}`, mine: ms, theirs: theirs.bestSectors[i], format: formatLapTime }))
          : []),
      ]
    : [];

  // Both sessions on one lap axis: lap 1 against lap 1, and so on.
  const toPoints = (source: EngineLap[], prefix: string): LapPoint[] =>
    countingLaps(source).map((lap, i, all) => ({
      key: `${prefix}${lap.lap_number}`,
      xLabel: String(lap.lap_number),
      ms: lap.lap_time_ms,
      position: lap.lap_number,
      breakBefore: i > 0 && lap.lap_number !== all[i - 1].lap_number + 1,
      title: `Ronde ${lap.lap_number}`,
    }));
  const points = toPoints(laps, "a");
  const comparePoints = compareLaps ? toPoints(compareLaps, "b") : [];

  return (
    <section aria-labelledby="compare-heading" className={cardClass}>
      <SectionHeading
        id="compare-heading"
        icon="compare"
        title="Vergelijk met een andere sessie"
        intro="Dezelfde kart of hetzelfde circuit. De keuze geldt ook voor de afstelling hieronder."
      />
      <form method="get" className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Vergelijk met sessie</span>
          <select name="vs" defaultValue={compareId ?? undefined} className={inputClass}>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${secondaryButtonClass} h-11`}>
          Vergelijk
        </button>
      </form>

      {compareLaps !== null && !hasComparison && (
        <p className="mt-4 text-sm text-zinc-400">
          {mine.validCount === 0 ? "Deze sessie heeft nog geen geldige ronden." : "Die sessie heeft geen geldige ronden om mee te vergelijken."}
        </p>
      )}

      {hasComparison && (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <caption className="sr-only">Deze sessie tegen {compareLabel}</caption>
              <thead className="text-left text-xs text-zinc-400">
                <tr className="border-b border-zinc-800">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    <span className="sr-only">Waarde</span>
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">Deze sessie</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Toen</th>
                  <th scope="col" className="py-2 font-medium">Verschil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {rows.map((row) => {
                  const delta = row.mine !== null && row.theirs !== null ? row.mine - row.theirs : null;
                  return (
                    <tr key={row.label}>
                      <th scope="row" className="py-2 pr-4 text-left font-normal text-zinc-400">{row.label}</th>
                      <td className="py-2 pr-4 font-semibold text-zinc-100">{row.format(row.mine)}</td>
                      <td className="py-2 pr-4 text-zinc-400">{row.format(row.theirs)}</td>
                      <td className={`py-2 ${delta !== null && delta < 0 ? "font-semibold text-zinc-100" : "text-zinc-400"}`}>
                        {delta === null ? "—" : (
                          <>
                            <span aria-hidden="true" className="mr-1 text-xs">{delta < 0 ? "▼" : delta > 0 ? "▲" : "="}</span>
                            {formatDelta(delta)}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-zinc-500">▼ is sneller of constanter dan toen, ▲ trager.</p>
          {points.length >= 2 && comparePoints.length >= 1 && (
            <div className="mt-6">
              <p className="mb-2 text-xs text-zinc-500">Rondetijd per ronde · lager is sneller</p>
              <LapTimeChart
                points={points}
                label="Rondetijden van beide sessies"
                seriesLabel="Deze sessie"
                compare={{ label: compareLabel ?? "Andere sessie", points: comparePoints }}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
