import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { EditOnly } from "@/components/edit-access";
import { AddSection, EditSection } from "@/components/edit-section";
import { FeedbackTags } from "@/components/feedback-tags";
import { cardClass, linkClass } from "@/components/ui";
import { parseFeedbackTags } from "@/lib/feedback";
import { getCurrentGarage } from "@/lib/garage";
import { lockedError } from "@/lib/plan-access";
import { format, plural } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import {
  formatCents,
  formatDate,
  formatLapTime,
  formatMinutes,
  formatTime,
  labelFor,
  ownOrOfficial,
  summarizeSetup,
  todayInAmsterdam,
  trackLabel,
  type SetupValues,
} from "@/lib/karting";
import { checklistSuggestions } from "@/lib/checklist-suggestions";
import { loadMaintenancePlan } from "@/lib/maintenance-plan-data";
import { weatherText, type SessionConditions } from "@/lib/weather";

import { MaintenancePlanList } from "../../agenda/maintenance-plan-list";
import { ExpenseForm } from "../../costs/expense-form";
import { deleteEvent } from "../../season-actions";
import { EventForm } from "../../seasons/event-form";
import { ExpenseList } from "../../costs/expense-list";
import { EventChecklist } from "./event-checklist";
import { SessionForm } from "./session-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getDictionary()).events.eventTitle} — CorsaIQ` };
}

type Conditions = SessionConditions;

export default async function EventPage({ params }: PageProps<"/dashboard/events/[id]">) {
  const { id } = await params;
  const { supabase, garage } = await getCurrentGarage();
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const te = t.events;
  const ts = t.session;
  const decimal = (value: number) => String(value).replace(".", ",");

  const [eventResult, kartsResult, driversResult, lastSetupResult, expensesResult, seasonsResult, tracksResult, checklistResult, gearResult] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id, name, type, starts_on, ends_on, notes, season_id, track_id, result_position, pole_lap_ms, tracks(name, city, country, latitude, longitude), seasons(name), sessions(id, type, started_at, duration_s, best_lap_ms, position, conditions, driver_feedback, feedback_tags, karts(name), drivers(name), setups(values), session_parts(part_id))",
        )
        .eq("id", id)
        .eq("garage_id", garage.id)
        .order("started_at", { referencedTable: "sessions" })
        .maybeSingle(),
      supabase.from("karts").select("id, name").eq("garage_id", garage.id).in("status", ["active", "spare"]).order("created_at"),
      supabase.from("drivers").select("id, name").eq("garage_id", garage.id).order("created_at"),
      supabase.from("setups").select("values").eq("garage_id", garage.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase
        .from("expenses")
        .select("id, category, spent_on, amount_cents, description, receipt_path, events(id, name)")
        .eq("event_id", id)
        .eq("garage_id", garage.id)
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("seasons").select("id, name").eq("garage_id", garage.id).order("year", { ascending: false }),
      supabase.from("tracks").select("id, name, city, country").or(ownOrOfficial(garage.id)),
      supabase.from("event_checklist_items").select("id, title, category, checked, suggestion_key").eq("event_id", id).order("created_at"),
      supabase
        .from("gear_items")
        .select("id, category, brand, model, valid_until, drivers(name)")
        .eq("garage_id", garage.id)
        .neq("status", "retired")
        .not("valid_until", "is", null),
    ]);
  if (eventResult.error) throw new Error(eventResult.error.message);
  const event = eventResult.data;
  if (!event) notFound();

  // For an event still to come: the maintenance to have done before it.
  const upcoming = (event.ends_on ?? event.starts_on) >= todayInAmsterdam();
  const plan = upcoming ? await loadMaintenancePlan(supabase, garage.id, todayInAmsterdam()) : [];
  const beforeThis = plan.filter((job) => job.event?.id === event.id);

  // The packing list, and for an event still to come what the app suggests adding to it.
  const checklist = checklistResult.data ?? [];
  const added = new Set(checklist.map((item) => item.suggestion_key).filter(Boolean));
  const suggestions = upcoming
    ? (
        await checklistSuggestions(t, locale, {
          event: {
            id: event.id,
            starts_on: event.starts_on,
            ends_on: event.ends_on,
            latitude: event.tracks?.latitude ?? null,
            longitude: event.tracks?.longitude ?? null,
          },
          gear: (gearResult.data ?? []).map((g) => ({
            id: g.id,
            label:
              [labelFor(t.options.gearCategories, g.category), g.brand, g.model].filter(Boolean).join(" ") +
              (g.drivers ? ` (${g.drivers.name})` : ""),
            valid_until: g.valid_until!,
          })),
          jobs: plan,
        })
      ).filter((s) => !added.has(s.key))
    : [];

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
          {te.back}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{event.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {labelFor(t.options.eventTypes, event.type)} · {event.tracks ? trackLabel(event.tracks) : te.unknownTrack} ·{" "}
          {formatDate(event.starts_on, locale)}
          {event.ends_on && event.ends_on !== event.starts_on && ` – ${formatDate(event.ends_on, locale)}`}
          {event.seasons && ` · ${event.seasons.name}`}
        </p>
      </section>

      <section aria-label={te.summary} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">{te.sessions}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{event.sessions.length}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">{te.bestLap}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{formatLapTime(bestLap)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">{te.driveTime}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{formatMinutes(totalMinutes, t.common.hourUnit)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">{te.costs}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{formatCents(totalCents)}</p>
        </div>
      </section>

      {beforeThis.length > 0 && (
        <section aria-labelledby="plan-heading" className={`${cardClass} border-amber-400/30`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="plan-heading" className="text-lg font-semibold">
              {te.maintenanceBefore}
            </h2>
            <Link href="/dashboard/agenda" className={`${linkClass} text-sm`}>
              {te.agenda}
            </Link>
          </div>
          <div className="mt-2">
            <MaintenancePlanList jobs={beforeThis} showEvent={false} />
          </div>
        </section>
      )}

      <EventChecklist
        eventId={event.id}
        items={checklist.map(({ id, title, category, checked }) => ({ id, title, category, checked }))}
        suggestions={suggestions}
      />

      {event.sessions.length > 0 && (
        <section aria-labelledby="sessions-heading" className={cardClass}>
          <h2 id="sessions-heading" className="text-lg font-semibold">
            {te.sessions}
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
                        {labelFor(t.options.sessionTypes, session.type)}
                      </Link>
                      <span className="font-normal text-zinc-500">
                        {" "}
                        · {formatTime(session.started_at)} · {session.karts?.name} · {session.drivers?.name}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatMinutes(Math.round((session.duration_s ?? 0) / 60), t.common.hourUnit)}
                      {conditions.weather && ` · ${weatherText(conditions, t.options.weather)}`}
                      {conditions.air_temp_c !== undefined && ` · ${format(ts.air, { temp: decimal(conditions.air_temp_c) })}`}
                      {conditions.track_temp_c !== undefined && ` · ${format(ts.track, { temp: decimal(conditions.track_temp_c) })}`}
                      {conditions.humidity_pct !== undefined && ` · ${format(ts.humidity, { pct: conditions.humidity_pct })}`}
                      {conditions.precipitation_mm ? ` · ${format(ts.rain, { mm: decimal(conditions.precipitation_mm) })}` : ""}
                      {` · ${plural(session.session_parts.length, t.equipment.partCount)}`}
                    </p>
                    {setup.length > 0 && <p className="mt-1 text-xs text-zinc-400">{setup.join(" · ")}</p>}
                    {session.driver_feedback && <p className="mt-2 text-sm text-zinc-300 italic">“{session.driver_feedback}”</p>}
                    <FeedbackTags tags={parseFeedbackTags(session.feedback_tags)} t={t} className="mt-2" />
                  </div>
                  <div className="text-left sm:text-right">
                    <p className={`text-lg font-semibold tabular-nums ${isBest ? "text-brand-300" : "text-zinc-100"}`}>
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

      <AddSection title={te.addSession} defaultOpen={event.sessions.length === 0}>
        {karts.length === 0 ? (
          <p className="text-sm text-zinc-400">
            {te.addKartFirst}{" "}
            <Link href="/dashboard/karts" className={linkClass}>
              {te.toKarts}
            </Link>
          </p>
        ) : (
          <SessionForm
            eventId={event.id}
            eventDate={event.starts_on}
            karts={karts}
            drivers={drivers}
            lastSetup={(lastSetupResult.data?.values as SetupValues | undefined) ?? null}
            autoWeather={event.tracks?.latitude != null && event.tracks.longitude != null}
          />
        )}
      </AddSection>

      <section aria-labelledby="costs-heading" className={cardClass}>
        <h2 id="costs-heading" className="text-lg font-semibold">
          {te.costs}
        </h2>
        <ExpenseList expenses={expenses} showEvent={false} />
        <EditOnly>
          <div className="mt-6 border-t border-zinc-800/80 pt-6">
            <ExpenseForm readLocked={await lockedError("receipts")} garageId={garage.id} eventId={event.id} defaultDate={event.starts_on} />
          </div>
        </EditOnly>
      </section>

      <EditSection
        title={te.editEvent}
        danger={
          <DeleteButton
            action={deleteEvent.bind(null, event.id)}
            label={te.deleteEvent}
            confirmText={[
              format(te.deleteConfirm, { name: event.name }),
              event.sessions.length > 0 && plural(event.sessions.length, te.deleteEventSessions),
              te.deleteEventCosts,
            ]
              .filter(Boolean)
              .join(" ")}
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
