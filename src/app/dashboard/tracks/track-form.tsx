"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";

import { createTrack, updateTrack } from "../track-actions";

const initialState: FormState = {};

export type TrackValues = { id: string; name: string; city: string | null; country: string | null };

/** Adds one of the garage's own tracks, or edits one when `track` is given. */
export function TrackForm({ track }: { track?: TrackValues }) {
  const [state, formAction, isPending] = useActionState(
    track ? updateTrack.bind(null, track.id) : createTrack,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-3">
      <label className={labelClass}>
        Naam *
        <input name="name" required defaultValue={track?.name} placeholder="Kartbaan De Polder" className={inputClass} />
      </label>
      <label className={labelClass}>
        Plaats
        <input name="city" defaultValue={track?.city ?? ""} placeholder="Lelystad" className={inputClass} />
      </label>
      <label className={labelClass}>
        Land (code)
        <input
          name="country"
          maxLength={2}
          defaultValue={track?.country ?? ""}
          placeholder="NL"
          className={`${inputClass} uppercase`}
        />
      </label>
      <div className="flex flex-col gap-4 sm:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : track ? "Wijzigingen opslaan" : "Circuit toevoegen"}
        </button>
      </div>
    </form>
  );
}
