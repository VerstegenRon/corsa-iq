import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";
import { formatGapSeconds, formatLapTime, labelFor } from "@/lib/karting";
import { DAY_ORDER, sessionLabel } from "@/lib/prestart";
import { TELEMETRY_BUCKET } from "@/lib/storage";
import {
  CHANNELS,
  CHART_CHANNELS,
  compareLaps,
  cornerResults,
  detectCorners,
  isTelemetryFile,
  oneThing,
  type Channel,
  type Corner,
  type CornerResult,
  type TelemetryFile,
} from "@/lib/telemetry";

import { PitboardButton, ReferenceButton, SaveCornersButton } from "./analyse-buttons";
import { TelemetryImportForm } from "./telemetry-import-form";
import { TraceChart } from "./trace-chart";

export const metadata: Metadata = {
  title: "Analyse — Corsa IQ",
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

const REF_KINDS = {
  own: "Eigen beste",
  team: "Teamgenoot",
  setup: "Vorige setup",
} as const;
type RefKind = keyof typeof REF_KINDS | "pinned";

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
function CornerBar({ corner, scale }: { corner: CornerResult; scale: number }) {
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
            <span
              className={`absolute inset-y-0 ${loss ? "left-1/2 bg-red-400" : "right-1/2 bg-brand-400"}`}
              style={{ width: `${share * 50}%` }}
            />
          )}
        </span>
        <span className="truncate font-mono text-[11px] text-zinc-500">
          rem {corner.brakeDiffM === 0 ? "=" : `${corner.brakeDiffM < 0 ? "−" : "+"}${Math.abs(corner.brakeDiffM)} m`} · {String(corner.apexYouKmh).replace(".", ",")}/
          {String(corner.apexRefKmh).replace(".", ",")} km/u
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
  if (disabled)
    return <span className="inline-flex min-h-11 items-center border border-zinc-800 px-3 text-sm text-zinc-600">{children}</span>;
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
  const [{ supabase, garage }, t] = await Promise.all([getCurrentGarage(), getDictionary()]);

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
  const withChannels = session.laps
    .filter((l) => l.lap_channels && l.is_valid && !l.is_pit_lap)
    .sort((a, b) => a.lap_number - b.lap_number);

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="channel-label mb-2 truncate">
          Analyse · {title}
          {session.drivers && ` · ${session.drivers.name}`}
        </p>
        <h1 className="text-3xl sm:text-4xl">
          Waar zit de tijd<span className="text-brand-400">?</span>
        </h1>
      </div>
      <Link href={`/dashboard/sessions/${session.id}`} className={`${linkClass} text-sm`}>
        Naar de sessie
      </Link>
    </div>
  );

  const importCard = (open: boolean) => (
    <details open={open} className={cardClass}>
      <summary className={`cursor-pointer font-semibold text-zinc-50 ${focusRing}`}>
        {open ? "Telemetrie importeren" : "Nieuwe telemetrie importeren"}
      </summary>
      <div className="mt-4 flex flex-col gap-4">
        <p className="text-sm text-zinc-400">
          Exporteer de sessie als CSV uit je loggersoftware (AiM Race Studio, Alfano, Unipro of MyChron) met de kanalen tijd, afstand en snelheid,
          en waar mogelijk toeren en G-krachten. Elke ronde wordt op vaste afstand (2,5 m) bewaard.
        </p>
        <TelemetryImportForm sessionId={session.id} garageId={garage.id} hasLaps={session.laps.length > 0} />
      </div>
    </details>
  );

  if (withChannels.length === 0) {
    return (
      <>
        {header}
        <section className={cardClass}>
          <p className="text-zinc-300">Deze sessie heeft nog geen telemetrie. Importeer het logger-bestand om elke ronde naast een referentie te leggen.</p>
        </section>
        {importCard(true)}
      </>
    );
  }

  // ---- Your lap: the chosen one, else the fastest with channels.
  const lapParam = Number(query.lap);
  const you =
    withChannels.find((l) => l.lap_number === lapParam) ?? [...withChannels].sort((a, b) => a.lap_time_ms - b.lap_time_ms)[0];

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

  // ---- Next session of the day, for "Eén ding voor Q2".
  const nextType = DAY_ORDER[DAY_ORDER.indexOf(session.type as (typeof DAY_ORDER)[number]) + 1];
  const nextLabel = nextType ? sessionLabel(nextType, event.sessions.filter((s) => s.type === nextType && s.kart_id === session.kart_id).length) : null;

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
        ? storedCorners.map((c) => ({ number: c.number, name: c.name ?? `T${c.number}`, apex_m: Number(c.apex_m), start_m: Number(c.start_m), end_m: Math.min(Number(c.end_m), comparison.lengthM) }))
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
  const channel: Channel = analysis && typeof query.ch === "string" && analysis.channels.includes(query.ch as Channel) ? (query.ch as Channel) : "speed";
  const focus = analysis ? oneThing(analysis.results) : null;
  const scale = analysis ? Math.max(0.02, ...analysis.results.map((r) => Math.abs(r.lossS))) : 1;
  const refNote = ref
    ? `${kind === "pinned" ? "Vastgezet" : REF_KINDS[kind as keyof typeof REF_KINDS]} · ${ref.driverName ?? ""} · ronde ${ref.lapNumber}${
        ref.sessionId === session.id ? "" : ` · ${labelFor(t.options.sessionTypes, ref.sessionType).toLowerCase()}`
      }`
    : "Geen andere ronde met telemetrie";

  return (
    <>
      {header}

      <section aria-label="Rondetijden" className="grid grid-cols-3 gap-px border border-zinc-800 bg-zinc-800">
        <Stat label="Jij" value={formatLapTime(you.lap_time_ms)} note={`Ronde ${you.lap_number}${session.karts ? ` · ${session.karts.name}` : ""}`} />
        <Stat label="Ref" value={ref ? formatLapTime(ref.lapTimeMs) : "—"} note={refNote} tone="ref" />
        <Stat
          label="Verschil"
          value={diffMs === null ? "—" : formatGapSeconds(diffMs)}
          note={diffMs === null ? undefined : diffMs > 0 ? "Trager dan de referentie" : diffMs < 0 ? "Sneller dan de referentie" : "Even snel"}
          tone={diffMs === null ? undefined : diffMs > 0 ? "loss" : "gain"}
        />
      </section>

      <section aria-label="Keuze" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <span className="channel-label mr-2 w-20 shrink-0">Ronde</span>
          {withChannels.map((l) => (
            <Chip key={l.id} href={params_({ lap: l.lap_number })} active={l.id === you.id}>
              <span className="font-mono tabular-nums">
                {l.lap_number} · {formatLapTime(l.lap_time_ms)}
              </span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="channel-label mr-2 w-20 shrink-0">Referentie</span>
          {(Object.keys(REF_KINDS) as (keyof typeof REF_KINDS)[]).map((k) => (
            <Chip key={k} href={params_({ ref: k })} active={kind === k} disabled={!byKind[k]}>
              {REF_KINDS[k]}
            </Chip>
          ))}
          {byKind.pinned && (
            <Chip href={params_({ ref: "pinned" })} active={kind === "pinned"}>
              Vastgezet
            </Chip>
          )}
        </div>
      </section>

      {!ref ? (
        <section className={cardClass}>
          <p className="text-zinc-300">
            Er is nog geen andere ronde met telemetrie op {event.tracks?.name ?? "dit circuit"} om mee te vergelijken. Importeer een sessie van een
            teamgenoot of een eerdere training.
          </p>
        </section>
      ) : !analysis ? (
        <section className={cardClass}>
          <p className="text-zinc-300">De telemetrie van deze ronden kon niet gelezen worden. Importeer het bestand opnieuw.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <section aria-label="Grafiek" className={`${cardClass} flex min-w-0 flex-col gap-4`}>
            <div className="flex flex-wrap items-center gap-1">
              <span className="channel-label mr-2">Kanaal</span>
              {CHART_CHANNELS.map((c) => (
                <Chip key={c} href={params_({ ch: c })} active={c === channel} disabled={!analysis.channels.includes(c)}>
                  {CHANNELS[c].label}
                </Chip>
              ))}
            </div>
            <TraceChart
              sampleM={analysis.comparison.sampleM}
              you={analysis.comparison.you[channel]!}
              reference={analysis.comparison.ref[channel]!}
              delta={analysis.comparison.delta}
              corners={analysis.corners.map((c) => ({ name: c.name, apex_m: c.apex_m }))}
              channel={{ code: CHANNEL_CODES[channel], label: CHANNELS[channel].label.toUpperCase(), unit: CHANNELS[channel].unit, digits: CHANNELS[channel].digits }}
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4">
              <ReferenceButton sessionId={session.id} lapId={ref.lapId} pinned={session.reference_lap_id === ref.lapId} />
              {session.track_layout_id && !analysis.stored && (
                <SaveCornersButton
                  sessionId={session.id}
                  layoutId={session.track_layout_id}
                  layoutName={session.track_layouts?.name ?? "deze lay-out"}
                  corners={analysis.corners}
                />
              )}
            </div>
          </section>

          <div className="flex min-w-0 flex-col gap-6">
            {focus && (
              <section aria-label="Eén ding" className="crop bg-brand-500 p-5 text-on-brand sm:p-6">
                <p className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase opacity-70">
                  Eén ding voor {nextLabel ?? "de volgende sessie"}
                </p>
                <p className="mt-2 font-display text-2xl leading-tight font-black uppercase">{focus.advice}.</p>
                <p className="mt-2 text-sm font-medium">
                  {focus.corner.name} kost {formatGapSeconds(Math.round(focus.corner.lossS * 1000)).replace("+", "")} s, het meeste van de ronde.
                </p>
                <PitboardButton liveId={liveId} text={focus.advice.toUpperCase()} />
              </section>
            )}

            <section aria-label="Per bocht" className={cardClass}>
              <div className="channel-label mb-1 flex justify-between">
                <span>Per bocht{analysis.stored ? "" : " · uit de referentie"}</span>
                <span>Jij − ref</span>
              </div>
              <ul className="divide-y divide-zinc-800/70">
                {analysis.results.map((r) => (
                  <CornerBar key={r.number} corner={r} scale={scale} />
                ))}
              </ul>
              <p className="mt-3 text-xs text-zinc-500">
                Links (volt) win je, rechts (rood) verlies je. Rem: rempunt t.o.v. de referentie (− is eerder geremd). Daarna de minimumsnelheid jij/ref.
              </p>
            </section>
          </div>
        </div>
      )}

      {importCard(false)}
    </>
  );
}
