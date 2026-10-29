import type { Metadata } from "next";
import Link from "next/link";

import { cardClass, linkClass, secondaryButtonClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate, formatLapTime, labelFor, todayInAmsterdam } from "@/lib/karting";
import type { LiveReference } from "@/lib/live";
import { DAY_ORDER } from "@/lib/prestart";

import { LiveBoard, type BoardLap } from "./live-board";
import { StartLiveForm, type ReferenceOption } from "./start-live-form";

export const metadata: Metadata = {
  title: "Live — CorsaIQ",
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

/** Live: the session being driven, from the pit stopwatch to every team device; or a new one to start. */
export default async function LivePage({ searchParams }: PageProps<"/dashboard/live">) {
  const query = await searchParams;
  const [{ supabase, garage, canEdit }, t] = await Promise.all([getCurrentGarage(), getDictionary()]);

  const { data: runningData } = await supabase
    .from("live_sessions")
    .select(
      "id, label, planned_laps, started_at, session_type, events(name, tracks(name)), karts(name), drivers(name), live_laps(id, lap_number, lap_time_ms, sectors_ms, position, gap_to_p1_ms, max_speed_kmh, max_water_temp_c, max_egt_c, max_rpm, is_pit_lap), laps(lap_number, lap_time_ms, lap_sectors(sector_number, sector_time_ms), sessions!laps_session_id_fkey(type, drivers(name)))",
    )
    .eq("garage_id", garage.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false });
  const running = runningData ?? [];
  const live = query.new ? null : (running.find((r) => r.id === query.id) ?? running[0] ?? null);

  const title = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="channel-label mb-2 truncate">
          {live
            ? `Live · ${live.events?.name ?? ""} · ${live.karts?.name ?? ""} · ${live.drivers?.name ?? ""}`
            : "Volg een sessie terwijl hij gereden wordt"}
        </p>
        <h1 className="text-3xl sm:text-4xl">
          {live ? labelFor(t.options.sessionTypes, live.session_type) : "Live"}
          <span className="text-brand-400">.</span>
        </h1>
      </div>
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Link href="/pitwall" className={`${linkClass} text-sm`}>
            Pitwall: sessie snel loggen
          </Link>
        </div>
      )}
    </div>
  );

  const others = running.filter((r) => r.id !== live?.id);
  const switcher =
    running.length > 0 ? (
      <nav aria-label="Live-sessies" className="flex flex-wrap gap-1">
        {others.map((r) => (
          <Link
            key={r.id}
            href={`/dashboard/live?id=${r.id}`}
            className={`inline-flex min-h-11 items-center gap-2 border border-zinc-800 px-3 text-sm text-zinc-300 hover:border-zinc-600 ${focusRing}`}
          >
            <span aria-hidden className="size-2 bg-red-400" />
            {r.label} · {r.karts?.name}
          </Link>
        ))}
        {live && canEdit && (
          <Link href="/dashboard/live?new=1" className={`${secondaryButtonClass}`}>
            Nog een kart live volgen
          </Link>
        )}
      </nav>
    ) : null;

  if (live) {
    const ref = live.laps;
    const reference: LiveReference = ref
      ? {
          lapTimeMs: ref.lap_time_ms,
          sectorsMs: [...ref.lap_sectors].sort((a, b) => a.sector_number - b.sector_number).map((s) => s.sector_time_ms),
          label: `ref ${ref.sessions?.drivers?.name ?? ""}`.trim(),
        }
      : null;
    const { data: message } = await supabase
      .from("pit_messages")
      .select("id, text")
      .eq("garage_id", garage.id)
      .is("cleared_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (
      <>
        {title}
        {switcher}
        <LiveBoard
          key={live.id}
          live={{
            id: live.id,
            garageId: garage.id,
            label: live.label,
            plannedLaps: live.planned_laps,
            startedAt: live.started_at,
            title: live.events?.name ?? "",
            kartName: live.karts?.name ?? "",
            driverName: live.drivers?.name ?? "",
          }}
          initialLaps={live.live_laps.map((l) => ({ ...l, max_speed_kmh: l.max_speed_kmh === null ? null : Number(l.max_speed_kmh) })) as BoardLap[]}
          reference={reference}
          initialMessage={message ?? null}
        />
      </>
    );
  }

  // ---- Nothing live (or another kart): start one.
  const today = todayInAmsterdam();
  const [eventsResult, kartsResult, driversResult, sessionsResult] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, starts_on, ends_on, track_id, tracks(name)")
      .eq("garage_id", garage.id)
      .order("starts_on", { ascending: false })
      .limit(30),
    supabase.from("karts").select("id, name").eq("garage_id", garage.id).in("status", ["active", "spare"]).order("created_at"),
    supabase.from("drivers").select("id, name").eq("garage_id", garage.id).order("created_at"),
    supabase
      .from("sessions")
      .select("kart_id, driver_id, type, event_id, events!inner(garage_id)")
      .eq("events.garage_id", garage.id)
      .order("started_at", { ascending: false })
      .limit(50),
  ]);
  const allEvents = eventsResult.data ?? [];
  // Today's event first, then the coming ones, then the most recent ones.
  const isToday = (e: (typeof allEvents)[number]) => e.starts_on <= today && (e.ends_on ?? e.starts_on) >= today;
  const ordered = [
    ...allEvents.filter(isToday),
    ...allEvents.filter((e) => e.starts_on > today).reverse(),
    ...allEvents.filter((e) => !isToday(e) && e.starts_on < today),
  ];
  const kartDrivers: Record<string, string> = {};
  for (const s of sessionsResult.data ?? []) kartDrivers[s.kart_id] ??= s.driver_id;
  const lastToday = (sessionsResult.data ?? []).find((s) => s.event_id === ordered[0]?.id)?.type;
  const nextIndex = lastToday ? DAY_ORDER.indexOf(lastToday as (typeof DAY_ORDER)[number]) + 1 : 0;
  const defaultType = DAY_ORDER[Math.min(nextIndex, DAY_ORDER.length - 1)] ?? "practice";

  const trackIds = [...new Set(ordered.map((e) => e.track_id))];
  const { data: refLaps } = trackIds.length
    ? await supabase
        .from("laps")
        .select(
          "id, lap_number, lap_time_ms, sessions!laps_session_id_fkey!inner(type, started_at, drivers(name), events!inner(garage_id, track_id))",
        )
        .eq("sessions.events.garage_id", garage.id)
        .in("sessions.events.track_id", trackIds)
        .eq("is_valid", true)
        .eq("is_pit_lap", false)
        .order("lap_time_ms")
        .limit(300)
    : { data: [] };
  const references: Record<string, ReferenceOption[]> = {};
  for (const lap of refLaps ?? []) {
    const list = (references[lap.sessions.events.track_id] ??= []);
    if (list.length >= 6) continue;
    list.push({
      lapId: lap.id,
      label: `${formatLapTime(lap.lap_time_ms)} · ${lap.sessions.drivers?.name ?? ""} · ${labelFor(t.options.sessionTypes, lap.sessions.type).toLowerCase()} ${formatDate(lap.sessions.started_at)}`,
    });
  }

  const karts = (kartsResult.data ?? []).map((k) => ({ id: k.id, label: k.name }));
  const drivers = (driversResult.data ?? []).map((d) => ({ id: d.id, label: d.name ?? "" }));

  return (
    <>
      {title}
      {switcher}
      {!canEdit ? (
        <section className={cardClass}>
          <p className="text-zinc-300">Er loopt nu geen live-sessie. Zodra iemand in het team er een start, zie je hem hier.</p>
        </section>
      ) : ordered.length === 0 || karts.length === 0 || drivers.length === 0 ? (
        <section className={cardClass}>
          <p className="text-zinc-300">Voor Live heb je een evenement, een kart en een coureur nodig.</p>
          <Link href="/dashboard/seasons#add-event" className={`${linkClass} mt-3 inline-block text-sm`}>
            Evenement plannen
          </Link>
        </section>
      ) : (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Live volgen</h2>
          <p className="mt-1 mb-5 text-sm text-zinc-400">
            Eén iemand in de pit klokt met de stopwatch; iedereen in het team ziet elke ronde, het verschil met de referentie en het pitbord direct.
          </p>
          <StartLiveForm
            events={ordered.map((e) => ({
              id: e.id,
              trackId: e.track_id,
              label: `${e.name} · ${formatDate(e.starts_on)}${e.tracks ? ` · ${e.tracks.name}` : ""}`,
            }))}
            karts={karts}
            drivers={drivers}
            kartDrivers={kartDrivers}
            types={Object.entries(t.options.sessionTypes)}
            defaultType={defaultType}
            references={references}
          />
        </section>
      )}
    </>
  );
}
