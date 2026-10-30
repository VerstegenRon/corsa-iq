"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { DeleteButton } from "@/components/delete-button";
import { useCanEdit } from "@/components/edit-access";
import { FeedbackField } from "@/components/feedback-field";
import { FormMessage, type FormState } from "@/components/form-message";
import { QuickTagToggles } from "@/components/quick-tags";
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { format, plural } from "@/lib/i18n/locales";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { formatGapSeconds, formatLapTime } from "@/lib/karting";
import {
  ENGINE_RANGES,
  engineStatus,
  formatRunning,
  parseGap,
  summarizeLive,
  type EngineChannel,
  type LiveLap,
  type LiveReference,
} from "@/lib/live";
import { createRealtimeClient } from "@/lib/supabase/client";

import { clearPitMessages, deleteLap, discardLive, endLive, recordLap, sendPitMessage, updateLap } from "../live-actions";

export type BoardLap = LiveLap & { id: number };
export type PitMessage = { id: string; text: string } | null;

type Props = {
  live: {
    id: string;
    garageId: string;
    label: string;
    plannedLaps: number | null;
    startedAt: string;
    title: string;
    kartName: string;
    driverName: string;
  };
  initialLaps: BoardLap[];
  reference: LiveReference;
  initialMessage: PitMessage;
};

type Watch = { lastPassage: number | null; splits: number[] };
type Pending = {
  lap_number: number;
  lap_time_ms: number;
  sectors_ms: number[];
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode: the stopwatch still works for this page view.
  }
}

const tone = (ms: number | null) => (ms === null ? "text-zinc-50" : ms < 0 ? "text-brand-300" : ms > 0 ? "text-red-300" : "text-zinc-50");

export function LiveBoard({ live, initialLaps, reference, initialMessage }: Props) {
  const tl = useT().raceDay.live;
  const router = useRouter();
  const [laps, setLaps] = useState<BoardLap[]>(initialLaps);
  const [message, setMessage] = useState<PitMessage>(initialMessage);
  const [ended, setEnded] = useState(false);
  const [timing, setTiming] = useState(false);
  const [watch, setWatch] = useState<Watch>({ lastPassage: null, splits: [] });
  const [pending, setPending] = useState<Pending[]>([]);
  const [now, setNow] = useState(0);
  const [notice, setNotice] = useState<FormState>({});
  // Viewers follow along: the board, laps and pitbord, without the stopwatch or any changes.
  const canEdit = useCanEdit();
  const watchKey = `corsaiq.live.${live.id}.watch`;
  const pendingKey = `corsaiq.live.${live.id}.pending`;
  const timingKey = `corsaiq.live.${live.id}.timing`;

  // The stopwatch survives a reload or a locked phone: it lives on this device.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after mounting
    setWatch(load(watchKey, { lastPassage: null, splits: [] }));
    setPending(load(pendingKey, []));
    setTiming(load(timingKey, false));
  }, [watchKey, pendingKey, timingKey]);

  useEffect(() => {
    if (watch.lastPassage === null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [watch.lastPassage]);

  // Realtime: every lap, change and pitbord message from any team device.
  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    void createRealtimeClient().then((supabase) => {
      if (cancelled) return;
      const channel = supabase
        .channel(`live:${live.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "live_laps",
            filter: `live_session_id=eq.${live.id}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const id = (payload.old as { id?: number }).id;
              setLaps((ls) => ls.filter((l) => l.id !== id));
              return;
            }
            const row = payload.new as BoardLap;
            setLaps((ls) => [...ls.filter((l) => l.lap_number !== row.lap_number), { ...row, sectors_ms: row.sectors_ms ?? [] }]);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pit_messages",
            filter: `garage_id=eq.${live.garageId}`,
          },
          (payload) => {
            const row = payload.new as { id: string; text: string; cleared_at: string | null } | undefined;
            if (row && !row.cleared_at && payload.eventType === "INSERT") setMessage({ id: row.id, text: row.text });
            else if (row?.cleared_at) setMessage((m) => (m?.id === row.id ? null : m));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "live_sessions",
            filter: `id=eq.${live.id}`,
          },
          (payload) => {
            if ((payload.new as { ended_at: string | null }).ended_at) setEnded(true);
          },
        )
        .subscribe();
      stop = () => void supabase.removeChannel(channel);
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [live.id, live.garageId]);

  // Laps tapped without signal wait here and go out as soon as there is a connection.
  const flush = useCallback(async () => {
    const queue = load<Pending[]>(pendingKey, []);
    for (const lap of queue) {
      const result: FormState & { id?: number } = await recordLap(live.id, lap).catch(() => ({ error: "offline" }));
      if (result.error === "offline") break;
      // Shown at once; Realtime brings the same lap to the other devices.
      const id = result.id;
      if (id !== undefined) setLaps((ls) => (ls.some((l) => l.lap_number === lap.lap_number) ? ls : [...ls, { ...toLap(lap), id }]));
      const rest = load<Pending[]>(pendingKey, []).filter((p) => p.lap_number !== lap.lap_number);
      save(pendingKey, rest);
      setPending(rest);
      if (result.error) setNotice({ error: format(tl.lapError, { lap: lap.lap_number, error: result.error }) });
    }
  }, [live.id, pendingKey, tl.lapError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sends what waited while the page was closed
    void flush();
    const id = setInterval(() => void flush(), 5000);
    window.addEventListener("online", flush);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", flush);
    };
  }, [flush]);

  const summary = useMemo(
    () => summarizeLive([...laps, ...pending.filter((p) => !laps.some((l) => l.lap_number === p.lap_number)).map(toLap)], reference),
    [laps, pending, reference],
  );
  const nextLapNumber = Math.max(0, ...summary.laps.map((l) => l.lap_number)) + 1;

  function setWatchSaved(next: Watch) {
    setWatch(next);
    save(watchKey, next);
  }

  function passage() {
    const t = Date.now();
    if (watch.lastPassage === null) {
      setWatchSaved({ lastPassage: t, splits: [] });
      return;
    }
    const lapTime = t - watch.lastPassage;
    if (lapTime < 5000) return; // a double tap
    const used = watch.splits.reduce((a, b) => a + b, 0);
    const sectors = watch.splits.length > 0 ? [...watch.splits, lapTime - used] : [];
    const lap = {
      lap_number: nextLapNumber,
      lap_time_ms: lapTime,
      sectors_ms: sectors,
    };
    const queue = [...load<Pending[]>(pendingKey, []), lap];
    save(pendingKey, queue);
    setPending(queue);
    setWatchSaved({ lastPassage: t, splits: [] });
    void flush();
  }

  function sector() {
    if (watch.lastPassage === null || watch.splits.length >= 5) return;
    const t = Date.now();
    const used = watch.splits.reduce((a, b) => a + b, 0);
    const split = t - watch.lastPassage - used;
    if (split < 1000) return;
    setWatchSaved({ ...watch, splits: [...watch.splits, split] });
  }

  const running = watch.lastPassage === null ? null : Math.max(0, now - watch.lastPassage);

  /** Closed into a session: this device's stopwatch and queue are done. */
  function closed(sessionId: string) {
    try {
      for (const key of [watchKey, pendingKey, timingKey]) localStorage.removeItem(key);
    } catch {
      // Nothing stored.
    }
    router.push(`/dashboard/sessions/${sessionId}`);
  }
  const last = summary.last;
  const sectorCount = Math.max(3, reference?.sectorsMs.length ?? 0, last?.sectors_ms.length ?? 0);

  if (ended) {
    return (
      <section className={cardClass}>
        <p className="text-zinc-300">{tl.endedElsewhere}</p>
        <button type="button" onClick={() => router.refresh()} className={`${secondaryButtonClass} mt-3`}>
          {tl.refresh}
        </button>
      </section>
    );
  }

  return (
    // One column on a phone (the stopwatch right under the board); on a tablet the board and laps
    // on the left, the stopwatch, pitbord and closing on the right.
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
      <div className="contents lg:flex lg:flex-col lg:gap-6">
        <div className="order-1 lg:order-none">
          {/* ---- The board: what everyone in the team looks at. */}
          <section aria-label={tl.title} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 bg-red-400 px-2.5 py-1.5 font-mono text-xs font-bold tracking-wider text-zinc-950">
                <span aria-hidden className="size-2 animate-pulse bg-zinc-950" />
                LIVE · {live.label}
              </span>
              <span className="font-mono text-sm tabular-nums text-zinc-300">
                {format(tl.lapCount, { count: summary.laps.length })}
                {live.plannedLaps ? `/${live.plannedLaps}` : ""}
                {summary.position !== null && (
                  <>
                    {" · "}
                    <span className="font-bold text-zinc-50">P{summary.position}</span>
                    {summary.gapToP1Ms !== null && summary.position > 1 && ` · ${format(tl.gapToP1, { gap: formatGapSeconds(summary.gapToP1Ms) })}`}
                  </>
                )}
              </span>
            </div>

            <div className="crop border border-zinc-800 bg-zinc-900 px-5 py-6 text-center">
              <p className="channel-label">{reference ? format(tl.lastLapAgainst, { reference: reference.label }) : tl.lastLap}</p>
              <p className={`mt-2 font-mono text-[64px] leading-none font-bold tabular-nums sm:text-[88px] ${tone(summary.deltaMs)}`}>
                {summary.deltaMs !== null ? formatGapSeconds(summary.deltaMs) : last ? formatLapTime(last.lap_time_ms) : "—"}
              </p>
              <p className="mt-3 font-mono text-sm tabular-nums text-zinc-400">
                {last ? `${formatLapTime(last.lap_time_ms)}` : tl.noLapYet}
                {reference && ` · ${format(tl.refTime, { time: formatLapTime(reference.lapTimeMs) })}`}
                {summary.best && ` · ${format(tl.bestTime, { time: formatLapTime(summary.best.lap_time_ms) })}`}
              </p>
            </div>

            <div
              className="grid gap-px border border-zinc-800 bg-zinc-800"
              style={{
                gridTemplateColumns: `repeat(${sectorCount}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: sectorCount }, (_, i) => {
                const you = last?.sectors_ms[i];
                const ref = reference?.sectorsMs[i];
                const diff = you !== undefined && ref !== undefined ? you - ref : null;
                return (
                  <div key={i} className="min-w-0 bg-zinc-900 px-3 py-3">
                    <p className="channel-label">S{i + 1}</p>
                    <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${tone(diff)}`}>
                      {diff !== null ? formatGapSeconds(diff) : you !== undefined ? formatLapTime(you) : "—"}
                    </p>
                    {you !== undefined && diff !== null && <p className="font-mono text-xs text-zinc-500">{formatLapTime(you)}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <div className="order-3 lg:order-none">
          {/* ---- Laps and the last lap's details. */}
          <section aria-label={tl.laps} className={cardClass}>
            <h2 className="text-lg font-semibold">{tl.laps}</h2>
            {summary.laps.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">{tl.noLaps}</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead className="channel-label text-left">
                    <tr>
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">{tl.colTime}</th>
                      <th className="py-2 pr-3 text-right font-medium">{tl.colAgainstRef}</th>
                      <th className="py-2 pr-3 text-right font-medium">{tl.colTop}</th>
                      <th className="py-2 font-medium">
                        <span className="sr-only">{tl.colActions}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70 font-mono">
                    {[...summary.laps].reverse().map((l) => {
                      const isBest = summary.best?.lap_number === l.lap_number;
                      const diff = reference ? l.lap_time_ms - reference.lapTimeMs : null;
                      const waiting = pending.some((p) => p.lap_number === l.lap_number) && !laps.some((x) => x.lap_number === l.lap_number);
                      return (
                        <tr key={l.lap_number} className={l.is_pit_lap ? "text-zinc-500" : ""}>
                          <td className="py-2 pr-3">{l.lap_number}</td>
                          <td className={`py-2 pr-3 font-bold ${isBest ? "text-brand-300" : "text-zinc-50"}`}>
                            {formatLapTime(l.lap_time_ms)}
                            {isBest && <span className="ml-2 bg-brand-500 px-1 text-[10px] text-on-brand">{tl.tagBest}</span>}
                            {l.is_pit_lap && <span className="ml-2 text-[10px]">{tl.tagPit}</span>}
                            {waiting && <span className="ml-2 text-[10px] text-amber-300">{tl.tagWaiting}</span>}
                          </td>
                          <td className={`py-2 pr-3 text-right ${tone(diff)}`}>{diff === null ? "—" : formatGapSeconds(diff)}</td>
                          <td className="py-2 pr-3 text-right text-zinc-400">{l.max_speed_kmh === null ? "—" : Math.round(l.max_speed_kmh)}</td>
                          <td className="py-2 text-right">
                            {!waiting && (
                              <DeleteButton
                                action={() => deleteLap(live.id, l.lap_number)}
                                confirmText={format(tl.deleteLapConfirm, { lap: l.lap_number })}
                                label={format(tl.deleteLapLabel, { lap: l.lap_number })}
                                iconOnly
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {canEdit && last && laps.some((l) => l.lap_number === last.lap_number) && (
              <LastLapEditor key={last.lap_number} liveId={live.id} lap={last} />
            )}
          </section>
        </div>
        <div className="order-4 lg:order-none">
          <EnginePanel engine={summary.engine} />
        </div>
      </div>
      <div className="contents lg:flex lg:flex-col lg:gap-6">
        <div className={`order-2 lg:order-none ${canEdit ? "" : "hidden"}`}>
          {/* ---- The stopwatch: only on the device that times. */}
          <section aria-label={tl.stopwatch} className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{tl.stopwatch}</h2>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={timing}
                  onChange={(e) => {
                    setTiming(e.target.checked);
                    save(timingKey, e.target.checked);
                  }}
                  className="size-5 accent-brand-400"
                />
                {tl.timingHere}
              </label>
            </div>
            {timing ? (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-center font-mono text-5xl font-bold tabular-nums text-zinc-50" aria-live="off">
                  {running === null ? "0,0" : formatRunning(running)}
                </p>
                <p className="text-center font-mono text-xs text-zinc-500">
                  {running === null
                    ? tl.tapStart
                    : `${format(tl.lapRunning, { lap: nextLapNumber })}${watch.splits.length ? ` · ${plural(watch.splits.length, tl.sectors)}` : ""}`}
                </p>
                <div className="grid grid-cols-[1fr_2fr] gap-2">
                  <button
                    type="button"
                    onClick={sector}
                    disabled={running === null}
                    className={`min-h-24 border border-zinc-700 text-lg font-bold text-zinc-50 disabled:opacity-40 ${focusRing}`}
                  >
                    {tl.sector}
                  </button>
                  <button
                    type="button"
                    onClick={passage}
                    className={`min-h-24 bg-brand-500 text-2xl font-black text-on-brand uppercase ${focusRing}`}
                  >
                    {running === null ? tl.startWatch : tl.passage}
                  </button>
                </div>
                {running !== null && (
                  <button
                    type="button"
                    onClick={() => setWatchSaved({ lastPassage: null, splits: [] })}
                    className={`${secondaryButtonClass} self-start`}
                  >
                    {tl.stopWatch}
                  </button>
                )}
                {pending.length > 0 && (
                  <p className="text-sm text-amber-300">
                    {plural(pending.length, tl.waitingLaps)}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">{tl.timingNote}</p>
            )}
            <FormMessage state={notice} />
          </section>
        </div>
        <div className="order-5 lg:order-none">
          <PitboardPanel
            liveId={live.id}
            message={message}
            onCleared={() => setMessage(null)}
            suggestions={boardSuggestions(summary, tl)}
            canEdit={canEdit}
          />
        </div>
        {canEdit && (
          <div className="order-6 lg:order-none">
            <ClosePanel liveId={live.id} lapCount={laps.length} onClosed={closed} />
          </div>
        )}
      </div>
    </div>
  );
}

function toLap(p: Pending): LiveLap {
  return {
    ...p,
    position: null,
    gap_to_p1_ms: null,
    max_speed_kmh: null,
    max_water_temp_c: null,
    max_egt_c: null,
    max_rpm: null,
    is_pit_lap: false,
  };
}

function boardSuggestions(summary: ReturnType<typeof summarizeLive>, tl: Dictionary["raceDay"]["live"]): string[] {
  const list: string[] = [];
  if (summary.position !== null)
    list.push(`P${summary.position}${summary.gapToP1Ms !== null && summary.position > 1 ? ` ${formatGapSeconds(summary.gapToP1Ms)}` : ""}`);
  if (summary.deltaMs !== null) list.push(format(tl.boardAgainstRef, { gap: formatGapSeconds(summary.deltaMs) }));
  list.push("BOX", "PUSH", tl.boardCalm);
  return list;
}

/** Position, gap, top speed and the engine values of the last lap, read from the dash or the timing. */
function LastLapEditor({ liveId, lap }: { liveId: string; lap: LiveLap }) {
  const tl = useT().raceDay.live;
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  const [position, setPosition] = useState(lap.position);

  function submit(formData: FormData) {
    const gap = parseGap(String(formData.get("gap") ?? ""));
    if (gap === undefined) {
      setState({ error: tl.gapFormat });
      return;
    }
    const num = (name: string) => {
      const raw = String(formData.get(name) ?? "")
        .trim()
        .replace(",", ".");
      return raw === "" ? null : Number(raw);
    };
    startTransition(async () => {
      const result = await updateLap(liveId, lap.lap_number, {
        position,
        gap_to_p1_ms: gap,
        max_speed_kmh: num("max_speed_kmh"),
        max_water_temp_c: num("max_water_temp_c"),
        max_egt_c: num("max_egt_c"),
        max_rpm: num("max_rpm"),
        is_pit_lap: formData.get("is_pit_lap") === "on",
      });
      setState(result.error ? result : { success: tl.saved });
    });
  }

  return (
    <details className="mt-4 border-t border-zinc-800 pt-4">
      <summary className={`cursor-pointer text-sm font-semibold text-zinc-200 ${focusRing}`}>
        {format(tl.lapDetails, { lap: lap.lap_number })}
      </summary>
      <form action={submit} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className={labelClass}>
            {tl.position}
            <div className="flex">
              <button
                type="button"
                aria-label={tl.positionUp}
                onClick={() => setPosition((p) => Math.max(1, (p ?? 2) - 1))}
                className={`h-12 w-12 border border-zinc-700 text-xl ${focusRing}`}
              >
                −
              </button>
              <output className="flex h-12 w-14 items-center justify-center border-y border-zinc-700 font-mono text-lg font-bold">
                {position === null ? "—" : `P${position}`}
              </output>
              <button
                type="button"
                aria-label={tl.positionDown}
                onClick={() => setPosition((p) => Math.min(99, (p ?? 0) + 1))}
                className={`h-12 w-12 border border-zinc-700 text-xl ${focusRing}`}
              >
                +
              </button>
            </div>
          </div>
          <label className={`${labelClass} w-32`}>
            {tl.gapLabel}
            <input
              name="gap"
              inputMode="decimal"
              defaultValue={lap.gap_to_p1_ms === null ? "" : (lap.gap_to_p1_ms / 1000).toFixed(3).replace(".", ",")}
              placeholder="+1,234"
              className={`${inputClass} font-mono`}
            />
          </label>
          <label className={`${labelClass} w-28`}>
            {tl.topSpeed}
            <input name="max_speed_kmh" inputMode="decimal" defaultValue={lap.max_speed_kmh ?? ""} className={`${inputClass} font-mono`} />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {(Object.keys(ENGINE_RANGES) as EngineChannel[]).map((c) => (
            <label key={c} className={`${labelClass} w-32`}>
              {tl.channels[c]} ({ENGINE_RANGES[c].unit})
              <input
                name={c}
                inputMode="decimal"
                defaultValue={lap[c] ?? ""}
                placeholder={`${ENGINE_RANGES[c].min}–${ENGINE_RANGES[c].max}`}
                className={`${inputClass} font-mono`}
              />
            </label>
          ))}
          <label className="flex min-h-12 items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="is_pit_lap" defaultChecked={lap.is_pit_lap} className="size-5 accent-brand-400" />
            {tl.pitLap}
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending} className={secondaryButtonClass}>
            {isPending ? tl.saving : tl.save}
          </button>
          <FormMessage state={state} />
        </div>
      </form>
    </details>
  );
}

function EnginePanel({ engine }: { engine: Record<EngineChannel, number | null> }) {
  const tl = useT().raceDay.live;
  return (
    <section aria-label={tl.engine} className="grid grid-cols-3 gap-px border border-zinc-800 bg-zinc-800">
      {(Object.keys(ENGINE_RANGES) as EngineChannel[]).map((c) => {
        const range = ENGINE_RANGES[c];
        const status = engineStatus(c, engine[c]);
        return (
          <div key={c} className="min-w-0 bg-zinc-900 px-3 py-3">
            <p className="channel-label truncate">{format(tl.maxChannel, { channel: tl.channels[c] })}</p>
            <p
              className={`mt-1 font-mono text-lg font-bold tabular-nums ${status === "high" ? "text-red-300" : status === "low" ? "text-amber-300" : "text-zinc-50"}`}
            >
              {engine[c] === null ? "—" : `${String(engine[c]).replace(".", ",")}`}
              {engine[c] !== null && <span className="ml-1 text-xs font-normal text-zinc-500">{range.unit}</span>}
            </p>
            <p className="truncate font-mono text-[11px] text-zinc-500">
              {status === "high" ? `${tl.tooHigh} · ` : status === "low" ? `${tl.tooLow} · ` : ""}
              {format(tl.targetRange, { min: range.min, max: range.max })}
            </p>
          </div>
        );
      })}
    </section>
  );
}

function PitboardPanel({
  liveId,
  message,
  onCleared,
  suggestions,
  canEdit,
}: {
  liveId: string;
  message: PitMessage;
  onCleared: () => void;
  suggestions: string[];
  canEdit: boolean;
}) {
  const tl = useT().raceDay.live;
  const [text, setText] = useState("");
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  const send = (value: string) =>
    startTransition(async () => {
      const result = await sendPitMessage(liveId, value);
      setState(result);
      if (result.success) setText("");
    });
  return (
    <section aria-label={tl.boardTitle} className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{tl.boardTitle}</h2>
        <Link href="/pitbord" target="_blank" className={`${secondaryButtonClass}`}>
          {tl.boardOpen}
        </Link>
      </div>
      {canEdit && (
        <p className="mt-1 text-sm text-zinc-400">
          {tl.boardHint}
        </p>
      )}
      <div className="mt-4 border border-zinc-800 px-4 py-3">
        <p className="channel-label">{tl.boardNow}</p>
        <p className="mt-1 font-display text-xl font-black uppercase">{message?.text ?? "—"}</p>
        {canEdit && message && (
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const result = await clearPitMessages();
                setState(result);
                if (!result.error) onCleared();
              })
            }
            className={`${secondaryButtonClass} mt-3`}
          >
            {tl.boardClear}
          </button>
        )}
      </div>
      {canEdit && (
        <>
          <div className="mt-4 flex flex-wrap gap-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={isPending}
                onClick={() => send(s)}
                className={`min-h-11 border border-zinc-700 px-3 font-mono text-sm font-bold text-zinc-100 hover:border-zinc-500 ${focusRing}`}
              >
                {s}
              </button>
            ))}
          </div>
          <form action={() => send(text)} className="mt-3 flex flex-wrap items-end gap-2">
            <label className={`${labelClass} min-w-0 flex-[1_1_14rem]`}>
              {tl.boardCustom}
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={80} placeholder={tl.boardPlaceholder} className={inputClass} />
            </label>
            <button type="submit" disabled={isPending || text.trim() === ""} className={secondaryButtonClass}>
              {tl.boardSend}
            </button>
          </form>
        </>
      )}
      <div className="mt-3">
        <FormMessage state={state} />
      </div>
    </section>
  );
}

function ClosePanel({ liveId, lapCount, onClosed }: { liveId: string; lapCount: number; onClosed: (sessionId: string) => void }) {
  const tl = useT().raceDay.live;
  const [state, formAction, isPending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await endLive(liveId, prev, formData);
    if (result.sessionId && !result.error) onClosed(result.sessionId);
    return result;
  }, {} as FormState);
  return (
    <section aria-label={tl.closeLabel} className={cardClass}>
      <h2 className="text-lg font-semibold">{tl.closeTitle}</h2>
      <p className="mt-1 text-sm text-zinc-400">{plural(lapCount, tl.closeIntro)}</p>
      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <QuickTagToggles />
        <FeedbackField label={tl.driverSays} rows={3} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={isPending || lapCount === 0} className={primaryButtonClass}>
            {isPending ? tl.saving : tl.closeSave}
          </button>
          <DeleteButton
            action={() => discardLive(liveId)}
            confirmText={tl.discardConfirm}
            label={tl.discardLabel}
            compact
          />
        </div>
        <FormMessage state={state} />
      </form>
    </section>
  );
}
