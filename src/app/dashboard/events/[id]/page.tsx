import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { EditSection } from "@/components/edit-section";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import {
  EVENT_TYPES,
  SESSION_TYPES,
  WEATHER,
  formatCents,
  formatDate,
  formatLapTime,
  formatMinutes,
  formatTime,
  labelFor,
  ownOrOfficial,
  summarizeSetup,
  trackLabel,
  type SetupValues,
} from "@/lib/karting";

import { ExpenseForm } from "../../costs/expense-form";
import { deleteEvent } from "../../season-actions";
import { EventForm } from "../../seasons/event-form";
import { ExpenseList } from "../../costs/expense-list";
import { SessionForm } from "./session-form";

export const metadata: Metadata = {
  title: "Evenement — CorsaIQ",
};

type Conditions = { weather?: string; air_temp_c?: number; track_temp_c?: number };

export default async function EventPage({ params }: PageProps<"/dashboard/events/[id]">) {
  const { id } = await params;
  const { supabase, garage } = await getCurrentGarage();

  const [eventResult, kartsResult, driversResult, lastSetupResult, expensesResult, seasonsResult, tracksResult] =
    await Promise.all([
    supabase
      .from("events")
      .select(
        "id, name, type, starts_on, ends_on, notes, season_id, track_id, tracks(name, city, country), seasons(name), sessions(id, type, started_at, duration_s, best_lap_ms, position, conditions, driver_feedback, karts(name), drivers(name), setups(values), session_parts(part_id))",
      )
      .eq("id", id)
      .eq("garage_id", garage.id)
      .order("started_at", { referencedTable: "sessions" })
      .maybeSingle(),
    supabase.from("karts").select("id, name").eq("garage_id", garage.id).in("status", ["active", "spare"]).order("created_at"),
    supabase.from("drivers").select("id, name").eq("garage_id", garage.id).order("created_at"),
    supabase
      .from("setups")
      .select("values")
      .eq("garage_id", garage.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("id, category, spent_on, amount_cents, description, receipt_path, events(id, name)")
      .eq("event_id", id)
      .eq("garage_id", garage.id)
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("seasons").select("id, name").eq("garage_id", garage.id).order("year", { ascending: false }),
    supabase.from("tracks").select("id, name, city, country").or(ownOrOfficial(garage.id)),
  ]);
  if (eventResult.error) throw new Error(eventResult.error.message);
  const event = eventResult.data;
  if (!event) notFound();

  const karts = (kartsResult.data ?? []).map((kart) => ({ id: kart.id, label: kart.name }));
  const drivers = (driversResult.data ?? []).map((driver) => ({ id: driver.id, label: driver.name }));
  const lapTimes = event.sessions.map((s) => s.best_lap_ms).filter((ms): ms is number => ms !== null);
  const bestLap = lapTimes.length > 0 ? Math.min(...lapTimes) : null;
  const totalMinutes = Math.round(event.sessions.reduce((sum, s) => sum + (s.duration_s ?? 0), 0) / 60);
  const expenses = expensesResult.data ?? [];
  const totalCents = expenses.reduce((sum, e) => sum + e.amount_cents, 0);

  return (
    <>
      <section>
        <Link href="/dashboard/seasons" className={`${linkClass} text-sm`}>
          ← Seizoen
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{event.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {labelFor(EVENT_TYPES, event.type)} · {event.tracks ? trackLabel(event.tracks) : "Onbekend circuit"} ·{" "}
          {formatDate(event.starts_on)}
          {event.ends_on && event.ends_on !== event.starts_on && ` – ${formatDate(event.ends_on)}`}
          {event.seasons && ` · ${event.seasons.name}`}
        </p>
      </section>

      <section aria-label="Samenvatting" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">Sessies</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{event.sessions.length}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">Snelste ronde</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatLapTime(bestLap)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">Rijtijd</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatMinutes(totalMinutes)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">Kosten</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatCents(totalCents)}</p>
        </div>
      </section>

      {event.sessions.length > 0 && (
        <section aria-labelledby="sessions-heading" className={cardClass}>
          <h2 id="sessions-heading" className="text-lg font-semibold">
            Sessies
          </h2>
          <ol className="mt-4 divide-y divide-zinc-800/80">
            {event.sessions.map((session) => {
              const conditions = session.conditions as Conditions;
              const setup = summarizeSetup((session.setups?.values ?? {}) as SetupValues);
              const isBest = bestLap !== null && session.best_lap_ms === bestLap;
              return (
                <li key={session.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      <Link href={`/dashboard/sessions/${session.id}`} className={linkClass}>
                        {labelFor(SESSION_TYPES, session.type)}
                      </Link>
                      <span className="font-normal text-zinc-500">
                        {" "}
                        · {formatTime(session.started_at)} · {session.karts?.name} · {session.drivers?.name}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatMinutes(Math.round((session.duration_s ?? 0) / 60))}
                      {conditions.weather && ` · ${labelFor(WEATHER, conditions.weather)}`}
                      {conditions.air_temp_c !== undefined && ` · lucht ${conditions.air_temp_c} °C`}
                      {conditions.track_temp_c !== undefined && ` · baan ${conditions.track_temp_c} °C`}
                      {` · ${session.session_parts.length} ${session.session_parts.length === 1 ? "onderdeel" : "onderdelen"}`}
                    </p>
                    {setup.length > 0 && <p className="mt-1 text-xs text-zinc-400">{setup.join(" · ")}</p>}
                    {session.driver_feedback && (
                      <p className="mt-2 text-sm text-zinc-300 italic">“{session.driver_feedback}”</p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className={`text-lg font-semibold tabular-nums ${isBest ? "text-cyan-300" : "text-zinc-100"}`}>
                      {formatLapTime(session.best_lap_ms)}
                    </p>
                    {session.position !== null && <p className="text-xs text-zinc-500">P{session.position}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section aria-labelledby="add-session-heading" className={cardClass}>
        <h2 id="add-session-heading" className="mb-6 text-lg font-semibold">
          Sessie toevoegen
        </h2>
        {karts.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Voeg eerst een kart toe.{" "}
            <Link href="/dashboard/karts" className={linkClass}>
              Naar karts
            </Link>
          </p>
        ) : (
          <SessionForm
            eventId={event.id}
            eventDate={event.starts_on}
            karts={karts}
            drivers={drivers}
            lastSetup={(lastSetupResult.data?.values as SetupValues | undefined) ?? null}
          />
        )}
      </section>

      <section aria-labelledby="costs-heading" className={cardClass}>
        <h2 id="costs-heading" className="text-lg font-semibold">
          Kosten
        </h2>
        <ExpenseList expenses={expenses} showEvent={false} />
        <div className="mt-6 border-t border-zinc-800/80 pt-6">
          <ExpenseForm garageId={garage.id} eventId={event.id} defaultDate={event.starts_on} />
        </div>
      </section>

      <EditSection
        title="Evenement bewerken"
        danger={
          <DeleteButton
            action={deleteEvent.bind(null, event.id)}
            label="Evenement verwijderen"
            confirmText={`${event.name} verwijderen?${event.sessions.length > 0 ? ` De ${event.sessions.length} ${event.sessions.length === 1 ? "sessie" : "sessies"} met afstellingen en rondetijden worden ook verwijderd.` : ""} Kosten blijven bewaard.`}
          />
        }
      >
        <EventForm
          event={event}
          seasons={(seasonsResult.data ?? []).map((s) => ({ id: s.id, label: s.name }))}
          tracks={(tracksResult.data ?? []).map((t) => ({ id: t.id, label: trackLabel(t) }))}
        />
      </EditSection>
    </>
  );
}
