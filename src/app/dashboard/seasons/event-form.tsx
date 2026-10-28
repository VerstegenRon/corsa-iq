"use client";

import { useActionState, useState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { EVENT_TYPES, sortByLabel, sortedEntries } from "@/lib/karting";

import { createEvent, updateEvent } from "../season-actions";

const initialState: FormState = {};

type Option = { id: string; label: string };

export type EventValues = {
  id: string;
  name: string;
  type: string;
  season_id: string | null;
  track_id: string;
  starts_on: string;
  ends_on: string | null;
};

/** Adds an event, or edits one when `event` is given. */
export function EventForm({ seasons, tracks, event }: { seasons: Option[]; tracks: Option[]; event?: EventValues }) {
  const [state, formAction, isPending] = useActionState(
    event ? updateEvent.bind(null, event.id) : createEvent,
    initialState,
  );
  const [trackId, setTrackId] = useState(event?.track_id ?? (tracks.length > 0 ? "" : "new"));

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className={labelClass}>
        Naam *
        <input name="name" required defaultValue={event?.name} placeholder="Ronde 1 – Genk" className={inputClass} />
      </label>
      <label className={labelClass}>
        Soort *
        <select name="type" required defaultValue={event?.type ?? "race"} className={inputClass}>
          {sortedEntries(EVENT_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Seizoen
        <select
          name="season_id"
          defaultValue={event ? (event.season_id ?? "") : (seasons[0]?.id ?? "")}
          className={inputClass}
        >
          <option value="">Geen (losse training)</option>
          {sortByLabel(seasons).map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Startdatum *
        <input name="starts_on" type="date" required defaultValue={event?.starts_on} className={inputClass} />
      </label>
      <label className={labelClass}>
        Einddatum
        <input name="ends_on" type="date" defaultValue={event?.ends_on ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Circuit *
        <select
          name="track_id"
          required
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          className={inputClass}
        >
          {tracks.length > 0 && (
            <option value="" disabled>
              Kies…
            </option>
          )}
          {sortByLabel(tracks).map((track) => (
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
          {isPending ? "Opslaan…" : event ? "Wijzigingen opslaan" : "Evenement toevoegen"}
        </button>
      </div>
    </form>
  );
}
