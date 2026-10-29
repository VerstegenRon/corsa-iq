"use client";

import { useActionState, useRef } from "react";

import { FeedbackField } from "@/components/feedback-field";
import { FormMessage, type FormState } from "@/components/form-message";
import { useT } from "@/lib/i18n/client";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { ChoiceChips, MoreDetails, Stepper } from "@/components/form-controls";
import { WEATHER_ICONS } from "@/components/icons";
import { sortByLabel, type SetupValues } from "@/lib/karting";
import { SETUP_FIELDS, SETUP_GROUPS, getSetupValue, inputSetupValue, type SetupGroup } from "@/lib/setup";
import type { SessionConditions } from "@/lib/weather";

import { createSession, updateSession } from "../../season-actions";

const initialState: FormState = {};

type Option = { id: string; label: string };

export type SessionValues = {
  id: string;
  type: string;
  kartName: string;
  driverId: string;
  /** "YYYY-MM-DDTHH:mm" in local (Dutch) time, for the datetime-local input. */
  startedLocal: string;
  durationMin: number;
  bestLap: string | null;
  hasLaps: boolean;
  position: number | null;
  conditions: SessionConditions;
  driverFeedback: string | null;
  setup: SetupValues;
};

/** "0.62" → "0,62", to match how drivers type decimals. */
const decimal = (value: number | undefined) => (value === undefined ? undefined : String(value).replace(".", ","));

/** Adds a session to an event, or edits one when `session` is given. */
export function SessionForm({
  eventId,
  eventDate,
  karts,
  drivers,
  lastSetup,
  session,
  autoWeather,
}: {
  eventId: string;
  eventDate: string;
  karts: Option[];
  drivers: Option[];
  lastSetup: SetupValues | null;
  session?: SessionValues;
  /** The circuit has coordinates, so the weather can be looked up. */
  autoWeather: boolean;
}) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(
    session ? updateSession.bind(null, session.id) : createSession.bind(null, eventId),
    initialState,
  );
  const localStartRef = useRef<HTMLInputElement>(null);
  const isoStartRef = useRef<HTMLInputElement>(null);

  // The server does not know the driver's time zone, so convert the local time in the browser.
  function handleSubmit() {
    const local = localStartRef.current?.value;
    if (isoStartRef.current) isoStartRef.current.value = local ? new Date(local).toISOString() : "";
  }

  const s = session?.setup ?? lastSetup ?? {};
  const c = session?.conditions ?? {};
  // Fetched values are not typed into the fields: left as they are, they are looked up again on saving.
  const isAuto = (field: string) => autoWeather && (session ? (c.auto ?? []).includes(field) : true);
  /** Placeholder of a field Open-Meteo fills in: the fetched value, or "automatisch" before the first save. */
  const autoHint = (field: "air_temp_c" | "humidity_pct" | "precipitation_mm", fallback: string) =>
    isAuto(field) ? (c[field] !== undefined ? `${decimal(c[field])} (automatisch)` : "automatisch") : fallback;
  const weatherOptions = [
    ...(autoWeather ? [{ value: "auto", label: "Automatisch" }] : []),
    ...Object.entries(t.options.weather).map(([value, label]) => ({ value, label, icon: WEATHER_ICONS[value] })),
  ];

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-8">
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-4 text-sm font-semibold text-zinc-200">Sessie</legend>
        <ChoiceChips
          name="type"
          legend="Soort"
          required
          defaultValue={session?.type ?? "practice"}
          options={Object.entries(t.options.sessionTypes).map(([value, label]) => ({ value, label }))}
        />
        <label className={labelClass}>
          Kart *
          {session ? (
            <span className={`${inputClass} flex items-center text-zinc-400`}>{session.kartName}</span>
          ) : (
            <select name="kart_id" required defaultValue={karts[0]?.id} className={inputClass}>
              {sortByLabel(karts).map((kart) => (
                <option key={kart.id} value={kart.id}>
                  {kart.label}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className={labelClass}>
          Coureur *
          <select name="driver_id" required defaultValue={session?.driverId ?? drivers[0]?.id} className={inputClass}>
            {sortByLabel(drivers).map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Starttijd *
          <input
            ref={localStartRef}
            type="datetime-local"
            required
            defaultValue={session?.startedLocal ?? `${eventDate}T10:00`}
            className={inputClass}
          />
          <input ref={isoStartRef} type="hidden" name="started_at_iso" />
        </label>
        <label className={labelClass}>
          Duur (minuten) *
          <input
            name="duration_min"
            required
            inputMode="decimal"
            defaultValue={decimal(session?.durationMin)}
            placeholder="15"
            className={inputClass}
          />
        </label>
        {session?.hasLaps ? (
          <p className="text-xs text-zinc-500 sm:pt-7">De snelste ronde volgt uit de geïmporteerde ronden.</p>
        ) : (
          <label className={labelClass}>
            Snelste ronde
            <input
              name="best_lap"
              inputMode="decimal"
              defaultValue={session?.bestLap ?? ""}
              placeholder="52.345"
              className={inputClass}
            />
          </label>
        )}
        <label className={labelClass}>
          Positie
          <input
            name="position"
            inputMode="numeric"
            defaultValue={session?.position ?? ""}
            placeholder="3"
            className={inputClass}
          />
        </label>
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
        <legend className="mb-4 text-sm font-semibold text-zinc-200">Omstandigheden</legend>
        <ChoiceChips
          name="weather"
          legend="Weer (bij de start)"
          defaultValue={isAuto("weather") ? "auto" : (c.weather ?? "dry")}
          options={weatherOptions}
        />
        <ChoiceChips
          name="weather_to"
          legend="Sloeg het weer om tijdens de sessie?"
          defaultValue={c.weather_to ?? ""}
          options={[
            { value: "", label: "Nee" },
            ...Object.entries(t.options.weather).map(([value, label]) => ({ value, label: `Werd ${label.toLowerCase()}`, icon: WEATHER_ICONS[value] })),
          ]}
        />
        <label className={labelClass}>
          Luchttemperatuur (°C)
          <input
            name="air_temp_c"
            inputMode="decimal"
            defaultValue={isAuto("air_temp_c") ? undefined : decimal(c.air_temp_c)}
            placeholder={autoHint("air_temp_c", "18")}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Baantemperatuur (°C)
          <input name="track_temp_c" inputMode="decimal" defaultValue={decimal(c.track_temp_c)} placeholder="24" className={inputClass} />
        </label>
        <label className={labelClass}>
          Luchtvochtigheid (%)
          <input
            name="humidity_pct"
            inputMode="numeric"
            defaultValue={isAuto("humidity_pct") ? undefined : decimal(c.humidity_pct)}
            placeholder={autoHint("humidity_pct", "65")}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Regen (mm)
          <input
            name="precipitation_mm"
            inputMode="decimal"
            defaultValue={isAuto("precipitation_mm") ? undefined : decimal(c.precipitation_mm)}
            placeholder={autoHint("precipitation_mm", "0")}
            className={inputClass}
          />
        </label>
        {autoWeather && (
          <p className="col-span-2 text-xs text-zinc-500 sm:col-span-3">
            Weer, luchttemperatuur, luchtvochtigheid en regen haalt de app bij het opslaan op bij Open-Meteo, voor dit circuit en de
            starttijd. Klopt het niet, bijvoorbeeld omdat een bui alleen boven de baan hing, kies of vul dan zelf iets in: dat gaat
            voor. De baantemperatuur meet je zelf.
          </p>
        )}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-1 text-sm font-semibold text-zinc-200">Afstelling</legend>
        <p className="mb-3 text-xs text-zinc-500 sm:col-span-2 lg:col-span-4">
          {session
            ? "Een gewijzigde afstelling wordt als nieuwe momentopname bewaard."
            : lastSetup
              ? "Ingevuld met je vorige afstelling. Pas aan wat je veranderde."
              : "Vul in wat je bijhoudt; alles is optioneel."}
        </p>
        {(Object.keys(SETUP_GROUPS) as SetupGroup[]).map((group) => {
          const fields = SETUP_FIELDS.filter((field) => field.group === group);
          const filled = fields.filter((field) => getSetupValue(s, field) !== undefined).length;
          return (
            <MoreDetails
              key={group}
              title={`${SETUP_GROUPS[group]}${filled > 0 ? ` · ${filled} ingevuld` : ""}`}
              defaultOpen={filled > 0}
              className="sm:col-span-2 lg:col-span-4"
              columns="lg:grid-cols-4"
            >
              {fields.map((field) =>
                field.unit === "bar" || field.group === "gearing" ? (
                  <Stepper
                    key={field.name}
                    name={field.name}
                    label={field.label}
                    defaultValue={inputSetupValue(field, getSetupValue(s, field))}
                    placeholder={field.placeholder}
                    step={field.unit === "bar" ? 0.01 : 1}
                    decimals={field.unit === "bar" ? 2 : 0}
                  />
                ) : (
                  <label key={field.name} className={labelClass}>
                    {field.label}
                    <input
                      name={field.name}
                      inputMode={field.kind === "integer" ? "numeric" : field.kind === "decimal" ? "decimal" : undefined}
                      defaultValue={inputSetupValue(field, getSetupValue(s, field))}
                      placeholder={field.placeholder}
                      className={inputClass}
                    />
                  </label>
                ),
              )}
            </MoreDetails>
          );
        })}
        <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
          Notities afstelling
          <input name="setup_notes" defaultValue={s.notes} className={inputClass} />
        </label>
      </fieldset>

      <FeedbackField defaultValue={session?.driverFeedback} />

      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : session ? "Wijzigingen opslaan" : "Sessie opslaan"}
        </button>
      </div>
    </form>
  );
}
