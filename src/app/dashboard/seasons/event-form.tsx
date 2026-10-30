"use client";

import { useActionState, useState } from "react";

import { ChoiceChips } from "@/components/form-controls";
import { FormMessage, type FormState } from "@/components/form-message";
import type { IconName } from "@/components/icons";
import { useT } from "@/lib/i18n/client";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { formatLapTime, sortByLabel } from "@/lib/karting";

import { createEvent, updateEvent } from "../season-actions";

const initialState: FormState = {};

const EVENT_ICONS: Record<string, IconName> = { race: "flag", training: "stopwatch", test: "wrench" };

type Option = { id: string; label: string };

export type EventValues = {
  id: string;
  name: string;
  type: string;
  season_id: string | null;
  track_id: string;
  starts_on: string;
  ends_on: string | null;
  result_position: number | null;
  pole_lap_ms: number | null;
};

/** Adds an event, or edits one when `event` is given. */
export function EventForm({ seasons, tracks, event }: { seasons: Option[]; tracks: Option[]; event?: EventValues }) {
  const t = useT();
  const te = t.events;
  const [state, formAction, isPending] = useActionState(
    event ? updateEvent.bind(null, event.id) : createEvent,
    initialState,
  );
  const [trackId, setTrackId] = useState(event?.track_id ?? (tracks.length > 0 ? "" : "new"));

  return (
    <form action={formAction} className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-3">
      <label className={`${labelClass} col-span-2 sm:col-span-1`}>
        {te.name}
        <input name="name" required defaultValue={event?.name} placeholder={te.eventPlaceholder} className={inputClass} />
      </label>
      <ChoiceChips
        name="type"
        legend={te.type}
        required
        defaultValue={event?.type ?? "race"}
        options={Object.entries(t.options.eventTypes).map(([value, label]) => ({ value, label, icon: EVENT_ICONS[value] }))}
      />
      <label className={`${labelClass} col-span-2 sm:col-span-1`}>
        {te.season}
        <select
          name="season_id"
          defaultValue={event ? (event.season_id ?? "") : (seasons[0]?.id ?? "")}
          className={inputClass}
        >
          <option value="">{te.noSeason}</option>
          {sortByLabel(seasons).map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {te.startsOn}
        <input name="starts_on" type="date" required defaultValue={event?.starts_on} className={inputClass} />
      </label>
      <label className={labelClass}>
        {te.endsOn}
        <input name="ends_on" type="date" defaultValue={event?.ends_on ?? ""} className={inputClass} />
      </label>
      <label className={`${labelClass} col-span-2 sm:col-span-1`}>
        {te.track}
        <select
          name="track_id"
          required
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          className={inputClass}
        >
          {tracks.length > 0 && (
            <option value="" disabled>
              {te.choose}
            </option>
          )}
          {sortByLabel(tracks).map((track) => (
            <option key={track.id} value={track.id}>
              {track.label}
            </option>
          ))}
          <option value="new">{te.newTrack}</option>
        </select>
      </label>

      {trackId === "new" && (
        <>
          <label className={`${labelClass} col-span-2 sm:col-span-1`}>
            {te.newTrackName}
            <input name="new_track_name" required placeholder={te.newTrackPlaceholder} className={inputClass} />
          </label>
          <label className={labelClass}>
            {te.city}
            <input name="new_track_city" placeholder={te.cityPlaceholder} className={inputClass} />
          </label>
          <label className={labelClass}>
            {te.country}
            <input name="new_track_country" maxLength={2} placeholder={te.countryPlaceholder} className={`${inputClass} uppercase`} />
          </label>
        </>
      )}

      {event && (
        <>
          <label className={labelClass}>
            {te.result}
            <input name="result_position" inputMode="numeric" defaultValue={event.result_position ?? ""} placeholder="3" className={inputClass} />
          </label>
          <label className={labelClass}>
            {te.pole}
            <input
              name="pole_lap"
              inputMode="decimal"
              defaultValue={event.pole_lap_ms ? formatLapTime(event.pole_lap_ms) : ""}
              placeholder="48.871"
              className={inputClass}
            />
          </label>
        </>
      )}

      <div className="flex flex-col gap-4 col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? te.saving : event ? te.saveChanges : te.addEvent}
        </button>
      </div>
    </form>
  );
}
