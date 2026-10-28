"use client";

import { useActionState, useState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { EVENT_TYPES } from "@/lib/karting";

import { createEvent } from "../season-actions";

const initialState: FormState = {};

type Option = { id: string; label: string };

export function EventForm({ seasons, tracks }: { seasons: Option[]; tracks: Option[] }) {
  const [state, formAction, isPending] = useActionState(createEvent, initialState);
  const [trackId, setTrackId] = useState(tracks.length > 0 ? "" : "new");

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className={labelClass}>
        Naam *
        <input name="name" required placeholder="Ronde 1 – Genk" className={inputClass} />
      </label>
      <label className={labelClass}>
        Soort *
        <select name="type" required defaultValue="race" className={inputClass}>
          {Object.entries(EVENT_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Seizoen
        <select name="season_id" defaultValue={seasons[0]?.id ?? ""} className={inputClass}>
          <option value="">Geen (losse training)</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Startdatum *
        <input name="starts_on" type="date" required className={inputClass} />
      </label>
      <label className={labelClass}>
        Einddatum
        <input name="ends_on" type="date" className={inputClass} />
      </label>
      <label className={labelClass}>
        Circuit *
        <select
          name="track_id"
          required
          value={trackId}
          onChange={(event) => setTrackId(event.target.value)}
          className={inputClass}
        >
          {tracks.length > 0 && (
            <option value="" disabled>
              Kies…
            </option>
          )}
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.label}
            </option>
          ))}
          <option value="new">+ Nieuw circuit</option>
        </select>
      </label>

      {trackId === "new" && (
        <>
          <label className={labelClass}>
            Naam circuit *
            <input name="new_track_name" required placeholder="Circuit Genk" className={inputClass} />
          </label>
          <label className={labelClass}>
            Land (code)
            <input name="new_track_country" maxLength={2} placeholder="BE" className={`${inputClass} uppercase`} />
          </label>
        </>
      )}

      <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : "Evenement toevoegen"}
        </button>
      </div>
    </form>
  );
}
