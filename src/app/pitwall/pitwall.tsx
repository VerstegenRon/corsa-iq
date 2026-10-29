"use client";

// Log a session trackside in seconds. Every session goes into a queue on the phone first and is
// sent from there, so a paddock without signal loses nothing: the queue empties itself as soon as
// the connection is back.

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { FeedbackField } from "@/components/feedback-field";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";
import { nearestTrack, NEAREST_TRACK_MAX_KM } from "@/lib/geo";
import { formatDate, type SetupValues } from "@/lib/karting";
import { PITWALL_EVENTS_KEY, PITWALL_QUEUE_KEY, PITWALL_SETUP_FIELDS, type NewEvent, type QueuedSession } from "@/lib/pitwall";
import { getSetupValue, inputSetupValue, type SetupField } from "@/lib/setup";

export type PitwallEvent = { id: string; label: string; isToday: boolean };
export type KartDefaults = { driverId: string; durationMin: number | null; setup: SetupValues | null };
type Option = { id: string; label: string };
type Track = Option & { name: string; latitude: number | null; longitude: number | null };
/** An event made here that the server may not have yet. */
type LocalEvent = PitwallEvent & { newEvent: NewEvent };

/** The event select's value for "make a new event for today". */
const NEW_EVENT = "new";

const focusRing = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-400";
const bigInputClass = `h-14 w-full rounded-2xl border-2 border-zinc-700 bg-zinc-950 px-4 text-lg text-zinc-50 placeholder:text-zinc-500 ${focusRing}`;
const RETRY_MS = 30_000;

function readQueue(): QueuedSession[] {
  try {
    const raw = localStorage.getItem(PITWALL_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSession[]) : [];
  } catch {
    return [];
  }
}

function readLocalEvents(): LocalEvent[] {
  try {
    const raw = localStorage.getItem(PITWALL_EVENTS_KEY);
    return raw ? (JSON.parse(raw) as LocalEvent[]) : [];
  } catch {
    return [];
  }
}

function writeLocalEvents(events: LocalEvent[]) {
  try {
    localStorage.setItem(PITWALL_EVENTS_KEY, JSON.stringify(events));
  } catch {}
}

function writeQueue(queue: QueuedSession[]) {
  try {
    localStorage.setItem(PITWALL_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or blocked: the queue still lives in memory until the page closes.
  }
}

/** The session's start: the typed time today, or else "it just finished": now minus its duration. */
function startedAtIso(time: string, durationMin: number): string {
  const now = new Date();
  if (!time) return new Date(now.getTime() - durationMin * 60_000).toISOString();
  const [hours, minutes] = time.split(":").map(Number);
  const start = new Date(now);
  start.setHours(hours, minutes, 0, 0);
  return start.toISOString();
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

export function Pitwall({
  events,
  defaultEventId,
  karts,
  drivers,
  defaults,
  lastType,
  tracks,
  lastTrackId,
  today,
}: {
  events: PitwallEvent[];
  defaultEventId: string | null;
  karts: Option[];
  drivers: Option[];
  defaults: Record<string, KartDefaults>;
  lastType: string | null;
  tracks: Track[];
  lastTrackId: string | null;
  /** YYYY-MM-DD in Dutch time, the date of an event made here. */
  today: string;
}) {
  const t = useT();
  const [eventId, setEventId] = useState(defaultEventId ?? NEW_EVENT);
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>([]);
  const [newTrackId, setNewTrackId] = useState(lastTrackId ?? tracks[0]?.id ?? "");
  const [newEventType, setNewEventType] = useState("training");
  const [kartId, setKartId] = useState(karts[0]?.id ?? "");
  // What was logged last per kart in this visit, so the next session starts from it.
  const [logged, setLogged] = useState<Record<string, Record<string, string>>>({});
  const [formKey, setFormKey] = useState(0);
  const [queue, setQueue] = useState<QueuedSession[]>([]);
  const [online, setOnline] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "wait" | "error"; text: string } | null>(null);
  const [authError, setAuthError] = useState(false);
  const flushing = useRef(false);

  const updateQueue = useCallback((update: (queue: QueuedSession[]) => QueuedSession[]) => {
    // Re-read storage so a second open tab's changes are not overwritten.
    const next = update(readQueue());
    writeQueue(next);
    setQueue(next);
    return next;
  }, []);

  /** Sends the queue in order. Stops at the first network failure: the rest waits for signal. */
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    setSending(true);
    try {
      for (const item of readQueue().filter((item) => !item.error)) {
        let response: Response;
        try {
          response = await fetch("/api/pitwall/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, eventId: item.eventId, fields: item.fields, newEvent: item.newEvent }),
          });
        } catch {
          setOnline(false);
          return;
        }
        setOnline(true);
        if (response.status === 401) {
          setAuthError(true);
          return;
        }
        // A server hiccup: try again later. Anything else is about this session; set it aside.
        if (response.status >= 500) return;
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setAuthError(false);
        if (response.ok) {
          updateQueue((queue) => queue.filter((queued) => queued.id !== item.id));
          setNotice({ tone: "ok", text: `Verstuurd: ${item.label}` });
        } else {
          const error = body.error ?? "Versturen mislukt.";
          updateQueue((queue) => queue.map((queued) => (queued.id === item.id ? { ...queued, error } : queued)));
        }
      }
    } finally {
      flushing.current = false;
      setSending(false);
    }
  }, [updateQueue]);

  useEffect(() => {
    // Mount only: the queue lives in this browser's storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueue(readQueue());
    // Events made here stay listed until the server sends them along with the page.
    const pending = readLocalEvents().filter((local) => !events.some((event) => event.id === local.id));
    writeLocalEvents(pending);
    setLocalEvents(pending);
    if (!defaultEventId) {
      const todays = pending.find((local) => local.newEvent.starts_on === today);
      if (todays) setEventId(todays.id);
    }
    setOnline(navigator.onLine);
    void flush();
    const goOnline = () => {
      setOnline(true);
      void flush();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const timer = window.setInterval(() => {
      if (readQueue().some((item) => !item.error)) void flush();
    }, RETRY_MS);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.clearInterval(timer);
    };
    // Mount only: the events and today come with the page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flush]);

  const kartDefaults = defaults[kartId];
  const last = logged[kartId] ?? {};
  const fieldDefault = (field: SetupField) =>
    last[field.name] ?? inputSetupValue(field, getSetupValue(kartDefaults?.setup ?? {}, field));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields: Record<string, string> = {};
    for (const [key, value] of form.entries()) if (typeof value === "string") fields[key] = value.trim();

    const durationMin = Number((fields.duration_min || "0").replace(",", "."));
    if (eventId === NEW_EVENT && !newTrackId) return setNotice({ tone: "error", text: "Kies het circuit van het evenement." });
    if (!(durationMin > 0)) return setNotice({ tone: "error", text: "Vul in hoeveel minuten de sessie duurde." });

    // A new event gets its id here and is saved with this session, so it also works without signal.
    let newEvent = localEvents.find((local) => local.id === eventId)?.newEvent;
    let targetEventId = eventId;
    if (eventId === NEW_EVENT) {
      const typeName = t.options.eventTypes[newEventType as keyof typeof t.options.eventTypes] ?? newEventType;
      const track = tracks.find((option) => option.id === newTrackId);
      newEvent = { id: crypto.randomUUID(), name: `${typeName} ${track?.name ?? ""}`.trim(), type: newEventType, track_id: newTrackId, starts_on: today };
      const local: LocalEvent = { id: newEvent.id, label: `${newEvent.name} · ${formatDate(today)}`, isToday: true, newEvent };
      const next = [local, ...readLocalEvents().filter((event) => event.id !== local.id)];
      writeLocalEvents(next);
      setLocalEvents(next);
      setEventId(local.id);
      targetEventId = local.id;
    }
    fields.started_at_iso = startedAtIso(fields.start_time, durationMin);
    delete fields.start_time;

    const typeLabel = t.options.sessionTypes[fields.type as keyof typeof t.options.sessionTypes] ?? fields.type;
    const kartLabel = karts.find((kart) => kart.id === kartId)?.label ?? "";
    const item: QueuedSession = {
      id: crypto.randomUUID(),
      eventId: targetEventId,
      ...(newEvent ? { newEvent } : {}),
      label: `${typeLabel} · ${kartLabel} · ${clock(fields.started_at_iso)}`,
      fields,
      queuedAt: new Date().toISOString(),
    };
    updateQueue((queue) => [...queue, item]);
    setLogged((current) => ({
      ...current,
      [kartId]: Object.fromEntries(
        ["driver_id", "type", "duration_min", ...PITWALL_SETUP_FIELDS.filter((f) => !f.name.startsWith("hot_")).map((f) => f.name)].map(
          (name) => [name, fields[name] ?? ""],
        ),
      ),
    }));
    setFormKey((key) => key + 1);
    // Only the send can tell whether there is signal (onLine says nothing about the paddock's mast);
    // a successful send replaces this notice.
    setNotice({ tone: "wait", text: `Op de telefoon bewaard: ${item.label}. Wordt verstuurd zodra er bereik is.` });
    window.scrollTo({ top: 0, behavior: "smooth" });
    void flush();
  }

  const waiting = queue.filter((item) => !item.error);
  const failed = queue.filter((item) => item.error);

  if (karts.length === 0 || drivers.length === 0) {
    return (
      <PitwallShell online={online} waiting={0}>
        <p className="text-lg text-zinc-200">
          {karts.length === 0
            ? "Voeg eerst een kart toe, dan kun je hier sessies loggen."
            : "Voeg eerst een coureur toe, dan kun je hier sessies loggen."}
        </p>
        <a
          href={karts.length === 0 ? "/dashboard/karts" : "/dashboard/drivers"}
          className={`inline-flex h-14 items-center justify-center rounded-full bg-brand-500 px-6 text-lg font-semibold text-on-brand ${focusRing}`}
        >
          Naar het dashboard
        </a>
      </PitwallShell>
    );
  }

  const tyreFields = PITWALL_SETUP_FIELDS.filter((field) => field.group === "tyres" && !field.name.startsWith("hot_"));
  const hotFields = PITWALL_SETUP_FIELDS.filter((field) => field.name.startsWith("hot_"));
  const gearFields = PITWALL_SETUP_FIELDS.filter((field) => field.group === "gearing");
  const weatherOptions = Object.entries(t.options.weather).map(([id, label]) => ({ id, label }));

  return (
    <PitwallShell online={online} waiting={waiting.length}>
      {notice && (
        <p
          role="status"
          className={`rounded-2xl border-2 px-4 py-3 text-base font-medium ${
            notice.tone === "error"
              ? "border-red-400 text-red-200"
              : notice.tone === "wait"
                ? "border-amber-400 text-amber-200"
                : "border-emerald-400 text-emerald-200"
          }`}
        >
          {notice.text}
        </p>
      )}

      <QueueList
        waiting={waiting}
        failed={failed}
        online={online}
        sending={sending}
        authError={authError}
        onSend={() => void flush()}
        onRemove={(id) => updateQueue((queue) => queue.filter((item) => item.id !== id))}
        onRetry={(id) => {
          updateQueue((queue) => queue.map(({ error: _error, ...item }) => (item.id === id ? item : { ...item, error: _error })));
          void flush();
        }}
      />

      <label className="flex flex-col gap-2 text-base font-medium text-zinc-200">
        Evenement
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={bigInputClass}>
          <option value={NEW_EVENT}>+ Nieuw evenement vandaag</option>
          {[...localEvents, ...events].map((event) => (
            <option key={event.id} value={event.id}>
              {event.isToday ? `Vandaag: ${event.label}` : event.label}
            </option>
          ))}
        </select>
      </label>

      {eventId === NEW_EVENT && (
        <fieldset className="flex flex-col gap-4 rounded-2xl border-2 border-zinc-700 p-4">
          <legend className="px-1 text-lg font-semibold text-zinc-50">Nieuw evenement vandaag</legend>
          {tracks.length === 0 ? (
            <p className="text-base text-zinc-200">
              Er is nog geen circuit.{" "}
              <Link href="/dashboard/tracks" className="underline underline-offset-4">
                Voeg er een toe
              </Link>{" "}
              in het dashboard.
            </p>
          ) : (
            <>
              <LocateTrack tracks={tracks} onFound={setNewTrackId} />
              <label className="flex flex-col gap-2 text-base font-medium text-zinc-200">
                Circuit
                <select value={newTrackId} onChange={(e) => setNewTrackId(e.target.value)} className={bigInputClass}>
                  {tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.label}
                    </option>
                  ))}
                </select>
              </label>
              <BigChoice
                legend="Soort"
                name="event_type_choice"
                options={Object.entries(t.options.eventTypes).map(([id, label]) => ({ id, label }))}
                value={newEventType}
                onChange={setNewEventType}
              />
              <p className="text-sm text-zinc-400">Wordt samen met de eerste sessie opgeslagen, ook zonder bereik.</p>
            </>
          )}
        </fieldset>
      )}

      {karts.length > 1 && (
        <BigChoice legend="Kart" name="kart_choice" options={karts} value={kartId} onChange={setKartId} />
      )}

      <form key={`${kartId}-${formKey}`} onSubmit={handleSubmit} className="flex flex-col gap-7">
        <input type="hidden" name="kart_id" value={kartId} />
        <BigChoice
          legend="Soort sessie"
          name="type"
          options={Object.entries(t.options.sessionTypes).map(([id, label]) => ({ id, label }))}
          defaultValue={last.type ?? lastType ?? "practice"}
        />
        {drivers.length > 1 ? (
          <BigChoice legend="Coureur" name="driver_id" options={drivers} defaultValue={last.driver_id ?? kartDefaults?.driverId ?? drivers[0].id} />
        ) : (
          <input type="hidden" name="driver_id" value={drivers[0].id} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <BigStepper
            name="duration_min"
            label="Duur (min)"
            defaultValue={last.duration_min ?? String(kartDefaults?.durationMin ?? 15)}
            step={1}
          />
          <label className="flex flex-col gap-2 text-base font-medium text-zinc-200">
            Starttijd
            <input name="start_time" type="time" className={`${bigInputClass} text-center tabular-nums`} />
            <span className="text-sm font-normal text-zinc-400">Leeg = net afgelopen</span>
          </label>
        </div>

        {/* Automatic: looked up from the circuit's weather once the session is sent. */}
        <BigChoice
          legend="Weer"
          name="weather"
          options={[{ id: "auto", label: "Automatisch" }, ...weatherOptions]}
          defaultValue="auto"
        />
        <details className="group -mt-3 rounded-2xl border-2 border-zinc-800 px-4 py-3">
          <summary className={`flex cursor-pointer list-none items-center justify-between rounded-lg text-base font-medium text-zinc-200 ${focusRing}`}>
            Weer sloeg om tijdens de sessie
            <Icon name="chevron" className="size-5 rotate-90 text-zinc-400 transition-transform group-open:-rotate-90" />
          </summary>
          <div className="mt-4">
            <BigChoice
              legend="Aan het eind was het"
              name="weather_to"
              options={[{ id: "", label: "Niet omgeslagen" }, ...weatherOptions]}
              defaultValue=""
            />
          </div>
        </details>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-lg font-semibold text-zinc-50">Bandenspanning koud (bar)</legend>
          {/* Laid out like the kart seen from above: front wheels on top. */}
          <div className="grid grid-cols-2 gap-3">
            {tyreFields.map((field) => (
              <BigStepper key={field.name} name={field.name} label={field.short.replace(" koud", "")} defaultValue={fieldDefault(field)} placeholder={field.placeholder} step={0.01} decimals={2} />
            ))}
          </div>
          <details className="group rounded-2xl border-2 border-zinc-800 px-4 py-3">
            <summary className={`flex cursor-pointer list-none items-center justify-between rounded-lg text-base font-medium text-zinc-200 ${focusRing}`}>
              Warm gemeten na de sessie
              <Icon name="chevron" className="size-5 rotate-90 text-zinc-400 transition-transform group-open:-rotate-90" />
            </summary>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {hotFields.map((field) => (
                // Hot pressures are measurements, not settings: never pre-filled, the last one is the hint.
                <BigStepper
                  key={field.name}
                  name={field.name}
                  label={field.short.replace(" warm", "")}
                  placeholder={inputSetupValue(field, getSetupValue(kartDefaults?.setup ?? {}, field)) ?? field.placeholder}
                  step={0.01}
                  decimals={2}
                />
              ))}
            </div>
          </details>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-lg font-semibold text-zinc-50">Overbrenging</legend>
          <div className="grid grid-cols-2 gap-3">
            {gearFields.map((field) => (
              <BigStepper key={field.name} name={field.name} label={field.label.replace(" (tanden)", "")} defaultValue={fieldDefault(field)} placeholder={field.placeholder} step={1} />
            ))}
          </div>
        </fieldset>

        <div className="text-base [&_label]:text-base [&_label]:font-medium [&_label]:text-zinc-200 [&_textarea]:border-2 [&_textarea]:border-zinc-700 [&_textarea]:text-lg">
          <FeedbackField label="Gevoel coureur" rows={4} />
        </div>

        <p className="text-sm text-zinc-400">De rest van de afstelling blijft zoals bij de vorige sessie van deze kart.</p>

        <div className="sticky bottom-0 -mx-4 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
          <button
            type="submit"
            className={`inline-flex h-16 w-full items-center justify-center gap-2 rounded-full bg-brand-500 text-xl font-bold text-on-brand transition-colors hover:bg-brand-600 ${focusRing}`}
          >
            <Icon name="check" className="size-6" />
            Sessie opslaan
          </button>
        </div>
      </form>
    </PitwallShell>
  );
}

function PitwallShell({ online, waiting, children }: { online: boolean; waiting: number; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="border-b-2 border-zinc-800">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-3">
          <span className="text-base font-bold tracking-[0.2em] text-brand-300 uppercase">Pitwall</span>
          <ConnectionBadge online={online} waiting={waiting} />
          <a
            href="/dashboard"
            aria-label="Naar het dashboard"
            className={`ml-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-zinc-700 text-zinc-100 ${focusRing}`}
          >
            <Icon name="home" className="size-5" />
          </a>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-7 px-4 pt-6 pb-4">
        <h1 className="sr-only">Pitwall: sessie loggen</h1>
        <InstallHint />
        {children}
      </main>
    </div>
  );
}

function ConnectionBadge({ online, waiting }: { online: boolean; waiting: number }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-sm font-semibold whitespace-nowrap ${
        online ? "border-emerald-400/70 text-emerald-200" : "border-amber-400 text-amber-200"
      }`}
    >
      <span aria-hidden="true" className={`size-2.5 rounded-full ${online ? "bg-emerald-400" : "bg-amber-400"}`} />
      {online ? "Online" : "Geen bereik"}
      {waiting > 0 && <span className="sr-only">, {waiting} sessies wachten</span>}
      {waiting > 0 && <span aria-hidden="true">· {waiting}</span>}
    </span>
  );
}

function QueueList({
  waiting,
  failed,
  online,
  sending,
  authError,
  onSend,
  onRemove,
  onRetry,
}: {
  waiting: QueuedSession[];
  failed: QueuedSession[];
  online: boolean;
  sending: boolean;
  authError: boolean;
  onSend: () => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (waiting.length === 0 && failed.length === 0) return null;
  return (
    <section aria-labelledby="queue-heading" className="rounded-2xl border-2 border-amber-400/70 p-4">
      <h2 id="queue-heading" className="text-lg font-semibold">
        Nog te versturen ({waiting.length + failed.length})
      </h2>
      {authError && (
        <p className="mt-2 text-base text-amber-200">
          Je bent uitgelogd. <a href="/login" className="underline underline-offset-4">Log opnieuw in</a>; de sessies blijven bewaard.
        </p>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {waiting.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-base text-zinc-200">
            <Icon name="upload" className="size-5 shrink-0 text-amber-300" />
            {item.label}
          </li>
        ))}
        {failed.map((item) => (
          <FailedItem key={item.id} item={item} onRemove={() => onRemove(item.id)} onRetry={() => onRetry(item.id)} />
        ))}
      </ul>
      {waiting.length > 0 && (
        <button
          type="button"
          onClick={onSend}
          disabled={sending}
          className={`mt-4 inline-flex h-12 items-center rounded-full border-2 border-zinc-600 px-5 text-base font-medium text-zinc-100 disabled:opacity-60 ${focusRing}`}
        >
          {sending ? "Versturen…" : online ? "Nu versturen" : "Opnieuw proberen"}
        </button>
      )}
    </section>
  );
}

function FailedItem({ item, onRemove, onRetry }: { item: QueuedSession; onRemove: () => void; onRetry: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="flex flex-col gap-2 rounded-xl border-2 border-red-400/60 p-3 text-base">
      <span className="text-zinc-100">{item.label}</span>
      <span className="text-red-200">{item.error}</span>
      <div className="flex flex-wrap gap-2">
        {confirming ? (
          <>
            <button type="button" onClick={onRemove} className={`h-11 rounded-full bg-red-500 px-4 font-semibold text-white ${focusRing}`}>
              Ja, weggooien
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={`h-11 rounded-full border-2 border-zinc-600 px-4 ${focusRing}`}>
              Bewaren
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onRetry} className={`h-11 rounded-full border-2 border-zinc-600 px-4 ${focusRing}`}>
              Opnieuw proberen
            </button>
            <button type="button" onClick={() => setConfirming(true)} className={`h-11 rounded-full border-2 border-zinc-600 px-4 ${focusRing}`}>
              Weggooien
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/** Big tap targets for a choice; controlled when `onChange` is given. */
function BigChoice({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
}: {
  legend: string;
  name: string;
  options: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-lg font-semibold text-zinc-50">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-zinc-700 px-3 py-2 text-center text-base text-zinc-100 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-500 has-[:checked]:font-bold has-[:checked]:text-on-brand has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-400"
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              {...(onChange ? { checked: value === option.id, onChange: () => onChange(option.id) } : { defaultChecked: defaultValue === option.id })}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function BigStepper({
  name,
  label,
  defaultValue,
  placeholder,
  step,
  decimals = 0,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  step: number;
  decimals?: number;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);

  function bump(direction: 1 | -1) {
    const input = ref.current;
    if (!input) return;
    // Start from the typed value, else from the placeholder (the usual value).
    const current = Number((input.value || input.placeholder || "0").replace(",", "."));
    const next = Math.max(0, (Number.isFinite(current) ? current : 0) + direction * step);
    input.value = next.toFixed(decimals).replace(".", ",");
  }

  const buttonClass = `inline-flex h-12 flex-1 items-center justify-center rounded-2xl border-2 border-zinc-700 bg-zinc-900 text-zinc-50 active:bg-zinc-800 ${focusRing}`;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-base font-medium text-zinc-200">
        {label}
      </label>
      {/* The value over the full width, so it stays readable; the buttons below it. */}
      <input
        ref={ref}
        id={id}
        name={name}
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`h-14 w-full min-w-0 rounded-2xl border-2 border-zinc-700 bg-zinc-950 px-2 text-center text-2xl font-semibold text-zinc-50 tabular-nums placeholder:font-normal placeholder:text-zinc-500 ${focusRing}`}
      />
      <div className="flex gap-2">
        <button type="button" onClick={() => bump(-1)} aria-label={`${label}: lager`} className={buttonClass}>
          <Icon name="minus" className="size-6" />
        </button>
        <button type="button" onClick={() => bump(1)} aria-label={`${label}: hoger`} className={buttonClass}>
          <Icon name="plus" className="size-6" />
        </button>
      </div>
    </div>
  );
}

const GEO_ERRORS: Record<number, string> = {
  1: "Geef de browser toegang tot je locatie, of kies het circuit uit de lijst.",
  2: "Je locatie is nu niet te bepalen. Kies het circuit uit de lijst.",
  3: "Je locatie bepalen duurde te lang. Probeer het opnieuw of kies uit de lijst.",
};

/**
 * Picks the circuit you are standing at from the phone's GPS, which needs no signal. Asks for the
 * location only on a tap, or by itself when the browser already has permission.
 */
function LocateTrack({ tracks, onFound }: { tracks: Track[]; onFound: (trackId: string) => void }) {
  const [state, setState] = useState<{ tone: "busy" | "ok" | "error"; text: string } | null>(null);
  const [supported, setSupported] = useState(false);

  const locate = useCallback(() => {
    setState({ tone: "busy", text: "Locatie bepalen…" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const found = nearestTrack(tracks, coords);
        if (!found) {
          setState({ tone: "error", text: `Geen bekend circuit binnen ${NEAREST_TRACK_MAX_KM} km. Kies het uit de lijst.` });
          return;
        }
        onFound(found.track.id);
        const km = found.km < 1 ? "minder dan 1 km" : `${found.km.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;
        setState({ tone: "ok", text: `Gevonden: ${found.track.name} (${km})` });
      },
      (error) => setState({ tone: "error", text: GEO_ERRORS[error.code] ?? GEO_ERRORS[2] }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  }, [tracks, onFound]);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => {
        if (status.state === "granted") locate();
      })
      .catch(() => {});
  }, [locate]);

  if (!supported) return null;
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={locate}
        disabled={state?.tone === "busy"}
        className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-brand-400/70 text-base font-semibold text-zinc-50 disabled:opacity-60 ${focusRing}`}
      >
        <Icon name="pin" className="size-5 text-brand-300" />
        {state?.tone === "busy" ? "Locatie bepalen…" : "Circuit zoeken via GPS"}
      </button>
      {state && state.tone !== "busy" && (
        <p role="status" className={`text-base ${state.tone === "ok" ? "text-emerald-200" : "text-amber-200"}`}>
          {state.text}
        </p>
      )}
    </div>
  );
}

type InstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Offers "add to home screen": Chrome's own prompt where there is one, a short how-to on iPhone. */
function InstallHint() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    let hidden = false;
    try {
      hidden = localStorage.getItem("corsaiq.pitwall.installHidden") === "1";
    } catch {}
    if (standalone || hidden) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || (!prompt && !isIos)) return null;

  function hide() {
    setDismissed(true);
    try {
      localStorage.setItem("corsaiq.pitwall.installHidden", "1");
    } catch {}
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-zinc-700 p-4 text-base">
      <div className="flex-1">
        <p className="font-semibold text-zinc-50">Zet de pitwall op je beginscherm</p>
        <p className="mt-1 text-zinc-300">
          {prompt ? "Eén tik vanaf je beginscherm, ook zonder bereik." : "Tik in Safari op Deel en kies ‘Zet op beginscherm’."}
        </p>
        {prompt && (
          <button
            type="button"
            onClick={async () => {
              await prompt.prompt();
              setPrompt(null);
            }}
            className={`mt-3 inline-flex h-12 items-center rounded-full bg-brand-500 px-5 font-semibold text-on-brand ${focusRing}`}
          >
            Installeren
          </button>
        )}
      </div>
      <button type="button" onClick={hide} aria-label="Melding sluiten" className={`inline-flex size-11 items-center justify-center rounded-full text-zinc-300 ${focusRing}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
