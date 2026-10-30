// Deeper lap analysis on the session page: where the time goes per sector, how each stint
// developed, top speed and revs per lap, and the laps next to another session.

import { LapTimeChart, type ChartKind, type LapPoint } from "@/components/lap-time-chart";
import { Icon } from "@/components/icons";
import { cardClass, inputClass, secondaryButtonClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format, plural, type Locale } from "@/lib/i18n/locales";
import { richFormat } from "@/lib/i18n/rich";
import { formatLapTime } from "@/lib/karting";
import { analyzeEngine, analyzeSectors, countingLaps, formatDelta, splitStints, summarizeLaps, type EngineLap, type Stint } from "@/lib/lap-analysis";

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

export function SectorAnalysis({ laps, t }: { laps: EngineLap[]; t: Dictionary }) {
  const ts = t.session;
  const sectors = analyzeSectors(laps);
  if (sectors.length === 0) return null;
  const maxLoss = Math.max(...sectors.map((s) => s.lossMs), 1);
  const worst = sectors.reduce((a, b) => (b.lossMs > a.lossMs ? b : a));

  return (
    <section aria-labelledby="sectors-heading" className={cardClass}>
      <SectionHeading id="sectors-heading" icon="target" title={ts.sectorsTitle} intro={ts.sectorsIntro} />
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
        <caption className="sr-only">{ts.sectorsCaption}</caption>
        <thead className="text-left text-xs text-zinc-400">
          <tr className="border-b border-zinc-800">
            <th scope="col" className="py-2 pr-3 font-medium">
              {ts.colSector}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {ts.colBest}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {ts.colAverage}
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              {ts.colLoss}
            </th>
            <th scope="col" className="py-2 font-medium">
              {ts.colSpread}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80">
          {sectors.map((sector) => (
            <tr key={sector.sector}>
              <th scope="row" className="py-2 pr-3 text-left font-medium">
                S{sector.sector}
              </th>
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
          {richFormat(ts.worstSector, {
            sector: <span className="font-semibold text-zinc-100">{format(ts.sectorName, { n: worst.sector })}</span>,
            loss: <span className="font-semibold text-zinc-100 tabular-nums">{seconds(worst.lossMs)} s</span>,
          })}
        </p>
      )}
    </section>
  );
}

function trendText(stint: Stint, ts: Dictionary["session"]) {
  if (stint.trendMsPerLap === null) return { text: ts.trendShort, tone: "text-zinc-500" };
  if (Math.abs(stint.trendMsPerLap) < STEADY_TREND_MS) return { text: ts.trendSteady, tone: "text-zinc-300" };
  const amount = seconds(Math.abs(stint.trendMsPerLap));
  return stint.trendMsPerLap > 0
    ? { text: format(ts.trendSlower, { amount }), tone: "text-amber-300" }
    : { text: format(ts.trendFaster, { amount }), tone: "text-zinc-100" };
}

export function StintAnalysis({ laps, t }: { laps: EngineLap[]; t: Dictionary }) {
  const ts = t.session;
  const stints = splitStints(laps).filter((stint) => stint.validCount > 0);
  if (stints.length === 0) return null;
  const single = stints.length === 1;

  return (
    <section aria-labelledby="stints-heading" className={cardClass}>
      <SectionHeading
        id="stints-heading"
        icon="flag"
        title={single ? ts.stintsOneTitle : ts.stintsTitle}
        intro={single ? ts.stintsOneIntro : ts.stintsIntro}
      />
      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stints.map((stint) => {
          const trend = trendText(stint, ts);
          return (
            <li key={stint.index} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{single ? ts.wholeSession : format(ts.stint, { n: stint.index })}</h3>
                <span className="text-xs text-zinc-500 tabular-nums">{format(ts.lapRange, { from: stint.firstLap, to: stint.lastLap })}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">{ts.fastest}</dt>
                  <dd className="font-semibold tabular-nums">{formatLapTime(stint.bestMs)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">{ts.colAverage}</dt>
                  <dd className="tabular-nums">{formatLapTime(stint.averageMs)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">{ts.colSpread}</dt>
                  <dd className="tabular-nums">{stint.spreadMs === null ? "—" : `±${seconds(stint.spreadMs)}`}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">{ts.trend}</dt>
                  <dd className={`tabular-nums ${trend.tone}`}>{trend.text}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-zinc-500">{plural(stint.validCount, ts.validLaps)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function lapPoints(laps: EngineLap[], value: (lap: EngineLap) => number | null, unit: string, ts: Dictionary["session"]): LapPoint[] {
  return countingLaps(laps)
    .filter((lap) => value(lap) !== null)
    .map((lap, i, all) => ({
      key: String(lap.lap_number),
      xLabel: String(lap.lap_number),
      ms: value(lap)!,
      position: lap.lap_number,
      breakBefore: i > 0 && lap.lap_number !== all[i - 1].lap_number + 1,
      title: format(ts.lap, { lap: lap.lap_number }),
      detail: `${format(ts.lapTimeDetail, { time: formatLapTime(lap.lap_time_ms) })}${unit ? ` · ${unit}` : ""}`,
    }));
}

export function EngineAnalysis({ laps, t, locale }: { laps: EngineLap[]; t: Dictionary; locale: Locale }) {
  const ts = t.session;
  const stats = analyzeEngine(laps);
  if (stats.topSpeedKmh === null && stats.maxRpm === null) return null;
  const number = new Intl.NumberFormat(locale);
  const speedPoints = lapPoints(laps, (lap) => (lap.max_speed_kmh === null ? null : Number(lap.max_speed_kmh)), ts.kmh, ts);
  const rpmPoints = lapPoints(laps, (lap) => lap.max_rpm, ts.rpm, ts);

  const tiles: { label: string; value: string; note: string }[] = [];
  if (stats.topSpeedKmh !== null) {
    tiles.push({
      label: ts.topSpeed,
      value: `${number.format(stats.topSpeedKmh)} ${ts.kmh}`,
      note: format(ts.topSpeedNote, { speed: number.format(stats.averageTopSpeedKmh!) }),
    });
    if (stats.bestLapSpeedKmh !== null) {
      const gap = Math.round((stats.topSpeedKmh - stats.bestLapSpeedKmh) * 10) / 10;
      tiles.push({
        label: ts.inBestLap,
        value: `${number.format(stats.bestLapSpeedKmh)} ${ts.kmh}`,
        note: gap === 0 ? ts.alsoTop : format(ts.belowTop, { gap: number.format(gap) }),
      });
    }
  }
  if (stats.maxRpm !== null) {
    tiles.push({ label: ts.maxRpm, value: number.format(stats.maxRpm), note: format(ts.maxRpmNote, { rpm: number.format(stats.averageMaxRpm!) }) });
  }

  const charts: { kind: ChartKind; title: string; points: LapPoint[] }[] = [
    { kind: "speed", title: ts.speedChart, points: speedPoints },
    { kind: "rpm", title: ts.rpmChart, points: rpmPoints },
  ];

  return (
    <section aria-labelledby="engine-heading" className={cardClass}>
      <SectionHeading id="engine-heading" icon="gauge" title={ts.engineTitle} intro={ts.engineIntro} />
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
              <p className="mb-2 text-xs text-zinc-500">
                {chart.title} · {ts.higherMore}
              </p>
              <LapTimeChart points={chart.points} label={chart.title} kind={chart.kind} />
            </div>
          ))}
      </div>
    </section>
  );
}

export type CompareCandidate = { id: string; label: string };

export function SessionComparison({
  t,
  laps,
  compareLaps,
  compareId,
  compareLabel,
  candidates,
}: {
  t: Dictionary;
  laps: EngineLap[];
  compareLaps: EngineLap[] | null;
  compareId: string | null;
  compareLabel: string | null;
  candidates: CompareCandidate[];
}) {
  if (candidates.length === 0) return null;
  const ts = t.session;
  const mine = summarizeLaps(laps);
  const theirs = compareLaps ? summarizeLaps(compareLaps) : null;
  const hasComparison = theirs !== null && theirs.validCount > 0 && mine.validCount > 0;

  const rows = hasComparison
    ? [
        { label: ts.best, mine: mine.bestMs, theirs: theirs.bestMs, format: formatLapTime },
        { label: ts.average, mine: mine.averageMs, theirs: theirs.averageMs, format: formatLapTime },
        { label: ts.spread, mine: mine.spreadMs, theirs: theirs.spreadMs, format: (ms: number | null) => (ms === null ? "—" : `±${seconds(ms)}`) },
        { label: ts.ideal, mine: mine.theoreticalBestMs, theirs: theirs.theoreticalBestMs, format: formatLapTime },
        ...(mine.bestSectors.length > 0 && mine.bestSectors.length === theirs.bestSectors.length
          ? mine.bestSectors.map((ms, i) => ({
              label: format(ts.bestSector, { n: i + 1 }),
              mine: ms,
              theirs: theirs.bestSectors[i],
              format: formatLapTime,
            }))
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
      title: format(ts.lap, { lap: lap.lap_number }),
    }));
  const points = toPoints(laps, "a");
  const comparePoints = compareLaps ? toPoints(compareLaps, "b") : [];

  return (
    <section aria-labelledby="compare-heading" className={cardClass}>
      <SectionHeading id="compare-heading" icon="compare" title={ts.compareTitle} intro={ts.compareIntro} />
      <form method="get" className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">{ts.compareWith}</span>
          <select name="vs" defaultValue={compareId ?? undefined} className={inputClass}>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${secondaryButtonClass} h-11`}>
          {ts.compare}
        </button>
      </form>

      {compareLaps !== null && !hasComparison && (
        <p className="mt-4 text-sm text-zinc-400">{mine.validCount === 0 ? ts.noValidHere : ts.noValidThere}</p>
      )}

      {hasComparison && (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <caption className="sr-only">{format(ts.compareCaption, { label: compareLabel ?? "" })}</caption>
              <thead className="text-left text-xs text-zinc-400">
                <tr className="border-b border-zinc-800">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    <span className="sr-only">{ts.value}</span>
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {ts.thisSession}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {ts.then}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {ts.colDelta}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {rows.map((row) => {
                  const delta = row.mine !== null && row.theirs !== null ? row.mine - row.theirs : null;
                  return (
                    <tr key={row.label}>
                      <th scope="row" className="py-2 pr-4 text-left font-normal text-zinc-400">
                        {row.label}
                      </th>
                      <td className="py-2 pr-4 font-semibold text-zinc-100">{row.format(row.mine)}</td>
                      <td className="py-2 pr-4 text-zinc-400">{row.format(row.theirs)}</td>
                      <td className={`py-2 ${delta !== null && delta < 0 ? "font-semibold text-zinc-100" : "text-zinc-400"}`}>
                        {delta === null ? (
                          "—"
                        ) : (
                          <>
                            <span aria-hidden="true" className="mr-1 text-xs">
                              {delta < 0 ? "▼" : delta > 0 ? "▲" : "="}
                            </span>
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
          <p className="mt-2 text-xs text-zinc-500">{ts.compareLegend}</p>
          {points.length >= 2 && comparePoints.length >= 1 && (
            <div className="mt-6">
              <p className="mb-2 text-xs text-zinc-500">{ts.chartCaption}</p>
              <LapTimeChart
                points={points}
                label={ts.bothSessions}
                seriesLabel={ts.thisSession}
                compare={{ label: compareLabel ?? ts.otherSession, points: comparePoints }}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
