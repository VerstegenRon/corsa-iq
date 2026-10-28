"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";

import { createSeason } from "../season-actions";

const initialState: FormState = {};

export function SeasonForm({ defaultYear }: { defaultYear: number }) {
  const [state, formAction, isPending] = useActionState(createSeason, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>
        Naam *
        <input name="name" required placeholder={`${defaultYear} – NK Rotax Senior`} className={inputClass} />
      </label>
      <label className={labelClass}>
        Jaar *
        <input name="year" required inputMode="numeric" defaultValue={defaultYear} className={inputClass} />
      </label>
      <label className={labelClass}>
        Klasse
        <input name="class" placeholder="Rotax Max Senior" className={inputClass} />
      </label>
      <label className={labelClass}>
        Kampioenschap
        <input name="championship" placeholder="NK, BNL, clubkampioenschap…" className={inputClass} />
      </label>
      <label className={labelClass}>
        Budget (€)
        <input name="budget" inputMode="decimal" placeholder="15000" className={inputClass} />
      </label>

      <div className="flex flex-col gap-4 sm:col-span-2">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : "Seizoen toevoegen"}
        </button>
      </div>
    </form>
  );
}
