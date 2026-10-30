import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { format, type Locale } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { formatGapSeconds, formatLapTime, labelFor } from "@/lib/karting";
import { DAY_ORDER, sessionLabel } from "@/lib/prestart";
import { TELEMETRY_BUCKET } from "@/lib/storage";
import { PlanLock } from "@/components/plan-lock";
import { getPlanAccess } from "@/lib/plan-access";
import {
  CHANNELS,
  CHART_CHANNELS,
  compareLaps,
  cornerResults,
  detectCorners,
  isTelemetryFile,
  oneThing,
  type Advice,
  type Channel,
  type Corner,
  type CornerResult,
  type TelemetryFile,
} from "@/lib/telemetry";

import { PitboardButton, ReferenceButton, SaveCornersButton } from "./analyse-buttons";
import { TelemetryImportForm } from "./telemetry-import-form";
import { TraceChart } from "./trace-chart";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).analysis.metaTitle };
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

const REF_KINDS = ["own", "team", "setup"] as const;
type RefKind = (typeof REF_KINDS)[number] | "pinned";

/** The advice for the worst corner, in the reader's language. */
function adviceText(corner: string, advice: Advice, tt: Dictionary["telemetry"], locale: Locale) {
  if (advice.kind === "throttle") return format(tt.throttle, { corner });
  if (advice.kind === "apexSpeed") return format(tt.apexSpeed, { corner, kmh: new Intl.NumberFormat(locale).format(advice.kmh) });
  return format(advice.kind === "brakeLater" ? tt.brakeLater : tt.brakeEarlier, { corner, metres: advice.metres });
}

const CHANNEL_CODES: Record<string, string> = { speed: "CH.01", rpm: "CH.03", lat_g: "CH.04" };

type Candidate = {
  lapId: number;
  lapNumber: number;
  lapTimeMs: number;
  path: string;
  sessionId: string;
  driverId: string;
  driverName: string | null;
  setupId: string | null;
  sessionType: string;
};

/** Per corner a diverging bar around the middle: a gain to the left in volt, a loss to the right in red. */
function CornerBar({ corner, scale, t, locale }: { corner: CornerResult; scale: number; t: Dictionary; locale: Locale }) {
  const speed = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const share = Math.min(1, Math.abs(corner.lossS) / scale);
  const loss = corner.lossS > 0.0005;
  const gain = corner.lossS < -0.0005;
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)_4.25rem] items-center gap-3 py-2">
      <span className="font-mono text-sm font-bold text-zinc-50">{corner.name}</span>
      <span className="flex flex-col gap-1">
        <span className="relative h-3 bg-zinc-800/60" aria-hidden>
          <span className="absolute inset-y-0 left-1/2 w-px bg-zinc-600" />
          {(loss || gain) && (
            <span className={`absolute inset-y-0 ${loss ? "left-1/2 bg-red-400" : "right-1/2 bg-brand-400"}`} style={{ width: `${share * 50}%` }} />
          )}
        </span>
        <span className="truncate font-mono text-[11px] text-zinc-500">
          {t.telemetry.brake} {corner.brakeDiffM === 0 ? "=" : `${corner.brakeDiffM < 0 ? "−" : "+"}${Math.abs(corner.brakeDiffM)} m`} ·{" "}
          {speed.format(corner.apexYouKmh)}/{speed.format(corner.apexRefKmh)} {t.session.kmh}
        </span>
      </span>
      <span className={`text-right font-mono text-sm font-bold tabular-nums ${loss ? "text-red-300" : gain ? "text-brand-300" : "text-zinc-400"}`}>
        {formatGapSeconds(Math.round(corner.lossS * 1000))}
      </span>
    </li>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "you" | "ref" | "loss" | "gain" }) {
  const color = tone === "loss" ? "text-red-300" : tone === "gain" ? "text-brand-300" : tone === "ref" ? "text-ref" : "text-zinc-50";
  return (
    <div className="min-w-0 bg-zinc-900 px-3 py-3 sm:px-4">
      <p className="channel-label">{label}</p>
      <p className={`mt-1 font-mono text-xl font-bold tabular-nums sm:text-3xl ${color}`}>{value}</p>
      {note && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 sm:truncate">{note}</p>}
    </div>
  );
}

function Chip({ href, active, disabled, children }: { href: string; active: boolean; disabled?: boolean; children: React.ReactNode }) {
  if (disabled) return <span className="inline-flex min-h-11 items-center border border-zinc-800 px-3 text-sm text-zinc-600">{children}</span>;
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-11 items-center border px-3 text-sm ${focusRing} ${
        active ? "border-brand-400 bg-brand-500 font-bold text-on-brand" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
      }`}
    >
      {children}
    </Link>
  );
}

async function readFile(supabase: Awaited<ReturnType<typeof getCurrentGarage>>["supabase"], path: string): Promise<TelemetryFile | null> {
  const { data } = await supabase.storage.from(TELEMETRY_BUCKET).download(path);
  if (!data) return null;
  try {
    const parsed: unknown = JSON.parse(await data.text());
    return isTelemetryFile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default async function SessionAnalysePage({ params, searchParams }: PageProps<"/dashboard/sessions/[id]/analyse">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [{ supabase, garage, canEdit }, t, locale] = await Promise.all([getCurrentGarage(), getDictionary(), getLocale()]);
  const tt = t.telemetry;
  if (!(await getPlanAccess()).has("telemetry")) return <PlanLock feature="telemetry" />;

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, type, kart_id, driver_id, setup_id, track_layout_id, reference_lap_id, drivers(name), karts(name), setups(parent_setup_id), track_layouts(name), events!inner(id, name, track_id, garage_id, tracks(name), sessions(type, kart_id)), laps!laps_session_id_fkey(id, lap_number, lap_time_ms, is_valid, is_pit_lap, lap_channels(storage_path))",
    )
    .eq("id", id)
    .eq("events.garage_id", garage.id)
    .maybeSingle();
  if (!session) notFound();

  const event = session.events;
  const title = `${labelFor(t.options.sessionTypes, session.type)} · ${event.name}`;
  const withChannels = session.laps.filter((l) => l.lap_channels && l.is_valid && !l.is_pit_lap).sort((a, b) => a.lap_number - b.lap_number);

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="channel-label mb-2 truncate">
          {format(tt.eyebrow, { title })}
          {session.drivers && ` · ${session.drivers.name}`}
        </p>
        <h1 className="text-3xl sm:text-4xl">
          {tt.headingStart}
          <span className="text-brand-400">?</span>
        </h1>
      </div>
      <Link href={`/dashboard/sessions/${session.id}`} className={`${linkClass} text-sm`}>
        {tt.toSession}
      </Link>
    </div>
  );

  // Importing is for members who may edit; viewers only read what is there.
  const importCard = (open: boolean) =>
    canEdit && (
      <details open={open} className={cardClass}>
        <summary className={`cursor-pointer font-semibold text-zinc-50 ${focusRing}`}>{open ? tt.importOpen : tt.importNew}</summary>
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-zinc-400">{tt.importIntro}</p>
          <TelemetryImportForm sessionId={session.id} garageId={garage.id} hasLaps={session.laps.length > 0} />
        </div>
      </details>
    );

  if (withChannels.length === 0) {
    return (
      <>
        {header}
        <section className={cardClass}>
          <p className="text-zinc-300">{canEdit ? `${tt.none} ${tt.noneImport}` : tt.none}</p>
        </section>
        {importCard(true)}
      </>
    );
  }

  // ---- Your lap: the chosen one, else the fastest with channels.
  const lapParam = Number(query.lap);
  const you = withChannels.find((l) => l.lap_number === lapParam) ?? [...withChannels].sort((a, b) => a.lap_time_ms - b.lap_time_ms)[0];

  // ---- Reference candidates: laps with telemetry at the same circuit.
  const { data: candidateRows } = await supabase
    .from("lap_channels")
    .select(
      "lap_id, storage_path, laps!inner(id, lap_number, lap_time_ms, is_valid, is_pit_lap, sessions!laps_session_id_fkey!inner(id, driver_id, setup_id, type, drivers(name), events!inner(track_id)))",
    )
    .eq("garage_id", garage.id)
    .eq("laps.sessions.events.track_id", event.track_id);
  const candidates: Candidate[] = (candidateRows ?? [])
    .filter((r) => r.laps.is_valid && !r.laps.is_pit_lap && r.laps.id !== you.id)
    .map((r) => ({
      lapId: r.laps.id,
      lapNumber: r.laps.lap_number,
      lapTimeMs: r.laps.lap_time_ms,
      path: r.storage_path,
      sessionId: r.laps.sessions.id,
      driverId: r.laps.sessions.driver_id,
      driverName: r.laps.sessions.drivers?.name ?? null,
      setupId: r.laps.sessions.setup_id,
      sessionType: r.laps.sessions.type,
    }))
    .sort((a, b) => a.lapTimeMs - b.lapTimeMs);

  const parentSetup = session.setups?.parent_setup_id ?? null;
  const byKind: Record<RefKind, Candidate | undefined> = {
    own: candidates.find((c) => c.driverId === session.driver_id),
    team: candidates.find((c) => c.driverId !== session.driver_id),
    setup: parentSetup ? candidates.find((c) => c.setupId === parentSetup) : undefined,
    pinned: candidates.find((c) => c.lapId === session.reference_lap_id),
  };
  const asked = typeof query.ref === "string" && query.ref in byKind ? (query.ref as RefKind) : null;
  const kind: RefKind | null =
    asked && byKind[asked]
      ? asked
      : byKind.pinned
        ? "pinned"
        : candidates[0]
          ? candidates[0].driverId === session.driver_id
            ? "own"
            : "team"
          : null;
  const ref = kind ? byKind[kind]! : null;

  const params_ = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams();
    const merged = { lap: you.lap_number, ref: asked, ch: typeof query.ch === "string" ? query.ch : null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== null && v !== undefined && v !== "") next.set(k, String(v));
    return `/dashboard/sessions/${session.id}/analyse?${next}`;
  };

  const [youFile, refFile] = await Promise.all([readFile(supabase, you.lap_channels!.storage_path), ref ? readFile(supabase, ref.path) : null]);

  // ---- Next session of the day, for "One thing for Q2".
  const nextType = DAY_ORDER[DAY_ORDER.indexOf(session.type as (typeof DAY_ORDER)[number]) + 1];
  const nextLabel = nextType
    ? sessionLabel(nextType, event.sessions.filter((s) => s.type === nextType && s.kart_id === session.kart_id).length)
    : null;

  let analysis: {
    comparison: ReturnType<typeof compareLaps>;
    results: CornerResult[];
    corners: Corner[];
    stored: boolean;
    channels: Channel[];
  } | null = null;
  if (youFile && refFile) {
    const comparison = compareLaps(youFile, refFile);
    const { data: storedCorners } = session.track_layout_id
      ? await supabase
          .from("track_layout_corners")
          .select("number, name, apex_m, start_m, end_m")
          .eq("garage_id", garage.id)
          .eq("track_layout_id", session.track_layout_id)
          .order("number")
      : { data: null };
    const corners: Corner[] =
      storedCorners && storedCorners.length > 0
        ? storedCorners.map((c) => ({
            number: c.number,
            name: c.name ?? `T${c.number}`,
            apex_m: Number(c.apex_m),
            start_m: Number(c.start_m),
            end_m: Math.min(Number(c.end_m), comparison.lengthM),
          }))
        : detectCorners(comparison.ref.speed!, comparison.sampleM);
    analysis = {
      comparison,
      corners,
      results: cornerResults(comparison, corners),
      stored: Boolean(storedCorners && storedCorners.length > 0),
      channels: CHART_CHANNELS.filter((c) => comparison.you[c] && comparison.ref[c]),
    };
  }

  const diffMs = ref ? you.lap_time_ms - ref.lapTimeMs : null;
  const { data: running } = await supabase
    .from("live_sessions")
    .select("id")
    .eq("garage_id", garage.id)
    .eq("kart_id", session.kart_id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const liveId = running?.id ?? null;
  const channel: Channel =
    analysis && typeof query.ch === "string" && analysis.channels.includes(query.ch as Channel) ? (query.ch as Channel) : "speed";
  const focus = analysis ? oneThing(analysis.results) : null;
  const scale = analysis ? Math.max(0.02, ...analysis.results.map((r) => Math.abs(r.lossS))) : 1;
  const refNote = ref
    ? [
        kind === "pinned" ? tt.pinned : tt.refKinds[kind as (typeof REF_KINDS)[number]],
        ref.driverName ?? "",
        format(t.session.bestNote, { lap: ref.lapNumber }),
        ...(ref.sessionId === session.id ? [] : [labelFor(t.options.sessionTypes, ref.sessionType).toLowerCase()]),
      ].join(" · ")
    : tt.noRef;
  const advice = focus ? adviceText(focus.corner.name, focus.advice, tt, locale) : null;

  return (
    <>
      {header}

      <section aria-label={tt.statsLabel} className="grid grid-cols-3 gap-px border border-zinc-800 bg-zinc-800">
        <Stat
          label={tt.you}
          value={formatLapTime(you.lap_time_ms)}
          note={`${format(t.session.lap, { lap: you.lap_number })}${session.karts ? ` · ${session.karts.name}` : ""}`}
        />
        <Stat label={tt.ref} value={ref ? formatLapTime(ref.lapTimeMs) : "—"} note={refNote} tone="ref" />
        <Stat
          label={tt.diff}
          value={diffMs === null ? "—" : formatGapSeconds(diffMs)}
          note={diffMs === null ? undefined : diffMs > 0 ? tt.slower : diffMs < 0 ? tt.faster : tt.same}
          tone={diffMs === null ? undefined : diffMs > 0 ? "loss" : "gain"}
        />
      </section>

      <section aria-label={tt.pickLabel} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <span className="channel-label mr-2 w-20 shrink-0">{tt.lap}</span>
          {withChannels.map((l) => (
            <Chip key={l.id} href={params_({ lap: l.lap_number })} active={l.id === you.id}>
              <span className="font-mono tabular-nums">
                {l.lap_number} · {formatLapTime(l.lap_time_ms)}
              </span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="channel-label mr-2 w-20 shrink-0">{tt.reference}</span>
          {REF_KINDS.map((k) => (
            <Chip key={k} href={params_({ ref: k })} active={kind === k} disabled={!byKind[k]}>
              {tt.refKinds[k]}
            </Chip>
          ))}
          {byKind.pinned && (
            <Chip href={params_({ ref: "pinned" })} active={kind === "pinned"}>
              {tt.pinned}
            </Chip>
          )}
        </div>
      </section>

      {!ref ? (
        <section className={cardClass}>
          <p className="text-zinc-300">{format(tt.noOtherLap, { track: event.tracks?.name ?? tt.thisTrack })}</p>
        </section>
      ) : !analysis ? (
        <section className={cardClass}>
          <p className="text-zinc-300">{tt.unreadable}</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <section aria-label={tt.chartLabel} className={`${cardClass} flex min-w-0 flex-col gap-4`}>
            <div className="flex flex-wrap items-center gap-1">
              <span className="channel-label mr-2">{tt.channel}</span>
              {CHART_CHANNELS.map((c) => (
                <Chip key={c} href={params_({ ch: c })} active={c === channel} disabled={!analysis.channels.includes(c)}>
                  {tt.channels[c]}
                </Chip>
              ))}
            </div>
            <TraceChart
              sampleM={analysis.comparison.sampleM}
              you={analysis.comparison.you[channel]!}
              reference={analysis.comparison.ref[channel]!}
              delta={analysis.comparison.delta}
              corners={analysis.corners.map((c) => ({ name: c.name, apex_m: c.apex_m }))}
              channel={{
                code: CHANNEL_CODES[channel],
                label: tt.channels[channel].toUpperCase(),
                unit: channel === "speed" ? t.session.kmh : CHANNELS[channel].unit,
                digits: CHANNELS[channel].digits,
              }}
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4">
              <ReferenceButton sessionId={session.id} lapId={ref.lapId} pinned={session.reference_lap_id === ref.lapId} />
              {session.track_layout_id && !analysis.stored && (
                <SaveCornersButton
                  sessionId={session.id}
                  layoutId={session.track_layout_id}
                  layoutName={session.track_layouts?.name ?? tt.thisLayout}
                  corners={analysis.corners}
                />
              )}
            </div>
          </section>

          <div className="flex min-w-0 flex-col gap-6">
            {focus && advice && (
              <section aria-label={tt.oneThingLabel} className="crop bg-brand-500 p-5 text-on-brand sm:p-6">
                <p className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase opacity-70">
                  {format(tt.oneThingFor, { session: nextLabel ?? tt.nextSession })}
                </p>
                <p className="mt-2 font-display text-2xl leading-tight font-black uppercase">{advice}.</p>
                <p className="mt-2 text-sm font-medium">
                  {format(tt.cornerCost, {
                    corner: focus.corner.name,
                    loss: formatGapSeconds(Math.round(focus.corner.lossS * 1000)).replace("+", ""),
                  })}
                </p>
                <PitboardButton liveId={liveId} text={advice.toUpperCase()} />
              </section>
            )}

            <section aria-label={tt.perCorner} className={cardClass}>
              <div className="channel-label mb-1 flex justify-between gap-3">
                <span>{analysis.stored ? tt.perCorner : `${tt.perCorner} · ${tt.fromReference}`}</span>
                <span className="shrink-0">{tt.youMinusRef}</span>
              </div>
              <ul className="divide-y divide-zinc-800/70">
                {analysis.results.map((r) => (
                  <CornerBar key={r.number} corner={r} scale={scale} t={t} locale={locale} />
                ))}
              </ul>
              <p className="mt-3 text-xs text-zinc-500">{tt.cornerLegend}</p>
            </section>
          </div>
        </div>
      )}

      {importCard(false)}
    </>
  );
}
