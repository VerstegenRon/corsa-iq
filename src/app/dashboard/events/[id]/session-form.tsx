"use client";

import { useActionState, useRef } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { SESSION_TYPES, WEATHER, type SetupValues } from "@/lib/karting";

import { createSession } from "../../season-actions";

const initialState: FormState = {};

type Option = { id: string; label: string };

export function SessionForm({
  eventId,
  eventDate,
  karts,
  drivers,
  lastSetup,
}: {
  eventId: string;
  eventDate: string;
  karts: Option[];
  drivers: Option[];
  lastSetup: SetupValues | null;
}) {
  const [state, formAction, isPending] = useActionState(createSession.bind(null, eventId), initialState);
  const localStartRef = useRef<HTMLInputElement>(null);
  const isoStartRef = useRef<HTMLInputElement>(null);

  // The server does not know the driver's time zone, so convert the local time in the browser.
  function handleSubmit() {
    const local = localStartRef.current?.value;
    if (isoStartRef.current) isoStartRef.current.value = local ? new Date(local).toISOString() : "";
  }

  const s = lastSetup ?? {};

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-8">
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-4 text-sm font-semibold text-zinc-200">Sessie</legend>
        <label className={labelClass}>
          Soort *
          <select name="type" required defaultValue="practice" className={inputClass}>
            {Object.entries(SESSION_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Kart *
          <select name="kart_id" required defaultValue={karts[0]?.id} className={inputClass}>
            {karts.map((kart) => (
              <option key={kart.id} value={kart.id}>
                {kart.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Coureur *
          <select name="driver_id" required defaultValue={drivers[0]?.id} className={inputClass}>
            {drivers.map((driver) => (
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
            defaultValue={`${eventDate}T10:00`}
            className={inputClass}
          />
          <input ref={isoStartRef} type="hidden" name="started_at_iso" />
        </label>
        <label className={labelClass}>
          Duur (minuten) *
          <input name="duration_min" required inputMode="decimal" placeholder="15" className={inputClass} />
        </label>
        <label className={labelClass}>
          Snelste ronde
          <input name="best_lap" inputMode="decimal" placeholder="52.345" className={inputClass} />
        </label>
        <label className={labelClass}>
          Positie
          <input name="position" inputMode="numeric" placeholder="3" className={inputClass} />
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-4 text-sm font-semibold text-zinc-200">Omstandigheden</legend>
        <label className={labelClass}>
          Weer
          <select name="weather" defaultValue="dry" className={inputClass}>
            {Object.entries(WEATHER).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Luchttemperatuur (°C)
          <input name="air_temp_c" inputMode="decimal" placeholder="18" className={inputClass} />
        </label>
        <label className={labelClass}>
          Baantemperatuur (°C)
          <input name="track_temp_c" inputMode="decimal" placeholder="24" className={inputClass} />
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-1 text-sm font-semibold text-zinc-200">Afstelling</legend>
        <p className="mb-3 text-xs text-zinc-500 sm:col-span-2 lg:col-span-4">
          {lastSetup ? "Ingevuld met je vorige afstelling. Pas aan wat je veranderde." : "Vul in wat je bijhoudt; alles is optioneel."}
        </p>
        <label className={labelClass}>
          Bandenspanning voor (bar, koud)
          <input name="pressure_front" inputMode="decimal" defaultValue={s.tyre_pressure_cold_bar?.front} placeholder="0,62" className={inputClass} />
        </label>
        <label className={labelClass}>
          Bandenspanning achter (bar, koud)
          <input name="pressure_rear" inputMode="decimal" defaultValue={s.tyre_pressure_cold_bar?.rear} placeholder="0,60" className={inputClass} />
        </label>
        <label className={labelClass}>
          Tandwiel voor (tanden)
          <input name="front_teeth" inputMode="numeric" defaultValue={s.gearing?.front_teeth} placeholder="12" className={inputClass} />
        </label>
        <label className={labelClass}>
          Tandwiel achter (tanden)
          <input name="rear_teeth" inputMode="numeric" defaultValue={s.gearing?.rear_teeth} placeholder="82" className={inputClass} />
        </label>
        <label className={labelClass}>
          Achteras (hardheid)
          <input name="axle_hardness" defaultValue={s.rear_axle?.hardness} placeholder="medium" className={inputClass} />
        </label>
        <label className={labelClass}>
          Spoorbreedte achter (mm)
          <input name="rear_track_width_mm" inputMode="numeric" defaultValue={s.rear_track_width_mm} placeholder="1395" className={inputClass} />
        </label>
        <label className={labelClass}>
          Spoorbreedte voor (mm)
          <input name="front_track_width_mm" inputMode="numeric" defaultValue={s.front_track_width_mm} placeholder="1270" className={inputClass} />
        </label>
        <label className={labelClass}>
          Hoofdsproeier
          <input name="main_jet" inputMode="numeric" defaultValue={s.carburettor?.main_jet} placeholder="125" className={inputClass} />
        </label>
        <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
          Notities afstelling
          <input name="setup_notes" defaultValue={s.notes} className={inputClass} />
        </label>
      </fieldset>

      <label className={labelClass}>
        Gevoel coureur
        <textarea
          name="driver_feedback"
          rows={3}
          placeholder="Onderstuur in bocht 3, goede tractie uit de haarspeld…"
          className={`${inputClass} h-auto py-3`}
        />
      </label>

      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : "Sessie opslaan"}
        </button>
      </div>
    </form>
  );
}
