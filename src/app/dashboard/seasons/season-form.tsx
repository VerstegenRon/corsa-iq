"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";

import { createSeason, updateSeason } from "../season-actions";

const initialState: FormState = {};

export type SeasonValues = {
  id: string;
  name: string;
  year: number;
  class: string | null;
  championship: string | null;
  budget_cents: number | null;
};

/** Adds a season, or edits one when `season` is given. */
export function SeasonForm({ defaultYear, season }: { defaultYear: number; season?: SeasonValues }) {
  const [state, formAction, isPending] = useActionState(
    season ? updateSeason.bind(null, season.id) : createSeason,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>
        Naam *
        <input
          name="name"
          required
          defaultValue={season?.name}
          placeholder={`${defaultYear} – NK Rotax Senior`}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Jaar *
        <input name="year" required inputMode="numeric" defaultValue={season?.year ?? defaultYear} className={inputClass} />
      </label>
      <label className={labelClass}>
        Klasse
        <input name="class" defaultValue={season?.class ?? ""} placeholder="Rotax Max Senior" className={inputClass} />
      </label>
      <label className={labelClass}>
        Kampioenschap
        <input
          name="championship"
          defaultValue={season?.championship ?? ""}
          placeholder="NK, BNL, clubkampioenschap…"
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Budget (€)
        <input
          name="budget"
          inputMode="decimal"
          defaultValue={season?.budget_cents != null ? String(season.budget_cents / 100).replace(".", ",") : ""}
          placeholder="15000"
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-4 sm:col-span-2">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : season ? "Wijzigingen opslaan" : "Seizoen toevoegen"}
        </button>
      </div>
    </form>
  );
}
