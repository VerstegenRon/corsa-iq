import type { Metadata } from "next";
import Link from "next/link";

import { cardClass, linkClass, primaryButtonClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";
import { formatHoursMinutes, labelFor, todayInAmsterdam, type SetupValues } from "@/lib/karting";
import { computeUsage } from "@/lib/part-usage";
import {
  CORNER_FIELDS,
  CORNERS,
  DAY_ORDER,
  hoursStatus,
  sessionLabel,
  tyreStatus,
  type CheckStatus,
} from "@/lib/prestart";
import { diffSetups, getSetupValue } from "@/lib/setup";
import { describeChanges } from "@/lib/setup-tree";
import { loadSetupTree } from "@/lib/setup-tree-data";
import { fetchWeather } from "@/lib/weather";

import { PrestartBoard, type BoardRow, type BoardTyre } from "./prestart-board";

export const metadata: Metadata = {
  title: "Vandaag — Corsa IQ",
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";
/** The last half hour, for the weather at the circuit right now. */
function halfAnHourAgo() {
  return new Date(Date.now() - 30 * 60_000).toISOString();
}

const clock = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

export default async function TodayPage({ searchParams }: PageProps<"/dashboard/vandaag">) {
  const query = await searchParams;
  const [{ supabase, garage, canManageTeam }, t] = await Promise.all([getCurrentGarage(), getDictionary()]);
  const today = todayInAmsterdam();

  // Today's event, else the next one.
  const [{ data: current }, { data: upcoming }, { data: kartsData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, starts_on, ends_on, tracks(name, city, latitude, longitude), sessions(type, kart_id, driver_id, started_at, drivers(race_number))")
      .eq("garage_id", garage.id)
      .lte("starts_on", today)
      .or(`ends_on.gte.${today},and(ends_on.is.null,starts_on.eq.${today})`)
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, name, starts_on, ends_on, tracks(name, city, latitude, longitude), sessions(type, kart_id, driver_id, started_at, drivers(race_number))")
      .eq("garage_id", garage.id)
      .gt("starts_on", today)
      .order("starts_on")
      .limit(1)
      .maybeSingle(),
    supabase.from("karts").select("id, name, class").eq("garage_id", garage.id).eq("status", "active").order("created_at"),
  ]);
  const event = current ?? upcoming;
  const karts = kartsData ?? [];
  const kart = karts.find((k) => k.id === query.kart) ?? karts[0];

  if (!event || !kart) {
    return (
      <>
        <section>
          <p className="channel-label mb-2">Pre-start</p>
          <h1 className="text-3xl sm:text-4xl">
            Vandaag<span className="text-brand-400">.</span>
          </h1>
        </section>
        <section className={cardClass}>
          <p className="text-zinc-300">
            {!kart ? "Nog geen actieve kart. Voeg je kart toe om de checklist te gebruiken." : "Geen evenement vandaag of gepland. Plan je volgende evenement."}
          </p>
          {canManageTeam && !kart ? (
            <Link href="/dashboard/start" className={`${primaryButtonClass} mt-4`}>
              Aan de slag: team, kart en eerste evenement
            </Link>
          ) : (
            <Link href={!kart ? "/dashboard/karts#add" : "/dashboard/seasons#add-event"} className={`${linkClass} mt-3 inline-block text-sm`}>
              {!kart ? "Kart toevoegen" : "Evenement plannen"}
            </Link>
          )}
        </section>
      </>
    );
  }

  // The session about to be driven: the chosen type, else the one after the last driven type.
  const ownSessions = event.sessions.filter((s) => s.kart_id === kart.id);
  const lastType = [...ownSessions].sort((a, b) => b.started_at.localeCompare(a.started_at))[0]?.type;
  const suggested = lastType ? (DAY_ORDER[Math.min(DAY_ORDER.indexOf(lastType as (typeof DAY_ORDER)[number]) + 1, DAY_ORDER.length - 1)] ?? "practice") : "practice";
  const type = typeof query.type === "string" && query.type in t.options.sessionTypes ? query.type : suggested;
  const label = sessionLabel(type, ownSessions.filter((s) => s.type === type).length);
  const raceNumber = ownSessions.map((s) => s.drivers?.race_number).find(Boolean);

  const [tree, checkResult, engineResult, tyreSetResult] = await Promise.all([
    loadSetupTree(supabase, garage.id, kart.id, { fallback: false }),
    supabase
      .from("prestart_checks")
      .select("id, locked_at, setup_id, tyre_pressure_readings(corner, bar, measured_at, temp_state), session_checks(key, value, status)")
      .eq("event_id", event.id)
      .eq("kart_id", kart.id)
      .eq("session_label", label)
      .maybeSingle(),
    supabase
      .from("part_installations")
      .select("parts!inner(id, brand, model, category, usage_limit_minutes, status, session_parts(sessions(started_at, duration_s)), maintenance_records(performed_on, resets_usage, components))")
      .eq("kart_id", kart.id)
      .is("removed_at", null)
      .eq("parts.category", "engine"),
    supabase.from("part_installations").select("parts!inner(brand, model, category)").eq("kart_id", kart.id).is("removed_at", null).eq("parts.category", "tyre_set"),
  ]);
  const check = checkResult.data;
  const setup = tree.versions.find((v) => v.isCurrent) ?? null;
  const fastest = tree.versions.find((v) => v.isFastest) ?? null;
  const values: SetupValues = setup?.values ?? {};
  const weather =
    event.tracks?.latitude != null && event.tracks.longitude != null && event.starts_on <= today
      ? await fetchWeather(event.tracks.latitude, event.tracks.longitude, halfAnHourAgo(), 1800)
      : null;

  // ---- Tyres: the latest cold reading per wheel against the setup.
  const readings = (check?.tyre_pressure_readings ?? []).filter((r) => r.temp_state === "cold").sort((a, b) => b.measured_at.localeCompare(a.measured_at));
  const tyres: BoardTyre[] = CORNERS.map((corner) => {
    const target = getSetupValue(values, CORNER_FIELDS[corner]);
    const reading = readings.find((r) => r.corner === corner);
    const value = reading ? Number(reading.bar) : null;
    const t = typeof target === "number" ? target : null;
    return { corner, target: t, value, status: tyreStatus(value, t) };
  });

  // ---- Drivetrain and the rest.
  const checks = new Map((check?.session_checks ?? []).map((c) => [c.key, c]));
  const gearing = values.gearing?.front_teeth && values.gearing.rear_teeth ? `${values.gearing.front_teeth}/${values.gearing.rear_teeth}` : null;
  const jet = values.carburettor?.main_jet ?? null;
  const engine = engineResult.data?.[0]?.parts ?? null;
  const engineMinutes = engine
    ? computeUsage(engine.session_parts.flatMap((sp) => (sp.sessions ? [sp.sessions] : [])), engine.maintenance_records, []).sinceResetMinutes
    : null;
  const tyreSet = tyreSetResult.data?.[0]?.parts ?? null;
  const tyreSetName = tyreSet ? [tyreSet.brand === "TEST" ? null : tyreSet.brand, tyreSet.model].filter(Boolean).join(" ") : null;
  const stored = (key: string): CheckStatus => (checks.get(key)?.status as CheckStatus | undefined) ?? "open";
  const weatherNote = weather ? `${String(weather.air_temp_c).replace(".", ",")} °C, ${weather.humidity_pct} % RV` : null;

  const rows: BoardRow[] = [
    {
      key: "gearing",
      name: "Overbrenging",
      spec: gearing ? `Doel ${gearing}${setup ? ` · setup ${setup.label}` : ""}` : "Geen overbrenging in de setup",
      value: gearing ?? "—",
      status: stored("gearing"),
      kind: "confirm",
    },
    {
      key: "chain",
      name: "Kettingspanning",
      spec: "Doel 10–15 mm speling",
      value: checks.get("chain")?.value ? `${String(checks.get("chain")!.value).replace(".", ",")} mm` : "—",
      status: stored("chain"),
      kind: "measure",
    },
    {
      key: "main_jet",
      name: "Hoofdsproeier",
      spec: jet ? `Doel ${jet}${weatherNote ? ` · ${weatherNote}` : ""}` : "Geen sproeier in de setup",
      value: jet ? String(jet) : "—",
      status: stored("main_jet"),
      kind: "confirm",
    },
    engine?.usage_limit_minutes && engineMinutes !== null
      ? {
          key: "engine",
          name: "Motoruren",
          spec: `Revisie bij ${formatHoursMinutes(engine.usage_limit_minutes)}`,
          value: formatHoursMinutes(engineMinutes),
          status: hoursStatus(engineMinutes, engine.usage_limit_minutes),
          kind: "auto",
        }
      : { key: "engine", name: "Motoruren", spec: "Geen motor met een limiet op deze kart", value: "—", status: "open" as CheckStatus, kind: "auto" },
    {
      key: "tyre_set",
      name: tyreSetName ? `${tyreSetName} gemarkeerd` : "Bandenset gemarkeerd",
      spec: `Voor ${labelFor(t.options.sessionTypes, type).toLowerCase()}`,
      value: "—",
      status: stored("tyre_set"),
      kind: "confirm",
    },
    {
      key: "lock",
      name: "Setup vergrendeld",
      spec: check?.locked_at ? `Om ${clock.format(new Date(check.locked_at))}` : "Na deze checklist",
      value: check?.locked_at ? (setup?.label ?? "✓") : "—",
      status: check?.locked_at ? "ok" : "open",
      kind: "auto",
    },
  ];

  const changes = setup && fastest && setup.id !== fastest.id ? describeChanges(diffSetups(fastest.values, setup.values)) : [];
  const typeOptions = Object.entries(t.options.sessionTypes).filter(([value]) => value !== "test");

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="channel-label">
          Pre-start{kart.class ? ` · ${kart.class}` : ""}
          {raceNumber ? ` #${raceNumber}` : ""} · {kart.name}
        </p>
        <span className="shrink-0 border border-zinc-800 px-2.5 py-2 font-mono text-xs tracking-wider uppercase">
          {(event.tracks?.city ?? event.tracks?.name ?? event.name).toUpperCase()} · {label}
        </span>
      </div>

      <nav aria-label="Sessie" className="-mt-4 flex flex-wrap gap-1">
        {typeOptions.map(([value, name]) => (
          <Link
            key={value}
            href={`/dashboard/vandaag?kart=${kart.id}&type=${value}`}
            aria-current={value === type ? "page" : undefined}
            className={`inline-flex min-h-11 items-center border px-3 text-sm ${focusRing} ${
              value === type ? "border-brand-400 bg-brand-500 font-bold text-on-brand" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
            }`}
          >
            {name}
          </Link>
        ))}
        {karts.length > 1 &&
          karts.map((k) => (
            <Link
              key={k.id}
              href={`/dashboard/vandaag?kart=${k.id}&type=${type}`}
              aria-current={k.id === kart.id ? "page" : undefined}
              className={`inline-flex min-h-11 items-center border px-3 text-sm ${focusRing} ${
                k.id === kart.id ? "border-zinc-50 text-zinc-50" : "border-zinc-800 text-zinc-400"
              }`}
            >
              {k.name}
            </Link>
          ))}
      </nav>

      <PrestartBoard
        ctx={{ eventId: event.id, kartId: kart.id, label, type, setupId: setup?.id ?? null }}
        label={label}
        eventName={event.name}
        upcoming={!current}
        tyres={tyres}
        temperature={weather ? `${String(weather.air_temp_c).replace(".", ",")} °C` : null}
        rows={rows}
        locked={Boolean(check?.locked_at)}
        setupLabel={setup?.label ?? null}
        compare={
          setup
            ? {
                title: fastest && fastest.id !== setup.id ? `Setup ${setup.label} · nieuw t.o.v. ${fastest.label}` : `Setup ${setup.label}`,
                changes,
              }
            : null
        }
      />
    </>
  );
}
