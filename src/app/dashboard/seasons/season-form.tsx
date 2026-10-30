"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { useLocale, useT } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/locales";

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
  const te = useT().events;
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState(
    season ? updateSeason.bind(null, season.id) : createSeason,
    initialState,
  );

  return (
    <form action={formAction} className="grid grid-cols-2 gap-x-3 gap-y-4">
      <label className={`${labelClass} col-span-2 sm:col-span-1`}>
        {te.name}
        <input
          name="name"
          required
          defaultValue={season?.name}
          placeholder={format(te.seasonPlaceholder, { year: defaultYear })}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {te.year}
        <input name="year" required inputMode="numeric" defaultValue={season?.year ?? defaultYear} className={inputClass} />
      </label>
      <label className={labelClass}>
        {te.class}
        <input name="class" defaultValue={season?.class ?? ""} placeholder={te.classPlaceholder} className={inputClass} />
      </label>
      <label className={`${labelClass} col-span-2 sm:col-span-1`}>
        {te.championship}
        <input
          name="championship"
          defaultValue={season?.championship ?? ""}
          placeholder={te.championshipPlaceholder}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        {te.budgetLabel}
        <input
          name="budget"
          inputMode="decimal"
          defaultValue={season?.budget_cents != null ? (locale === "en" ? String(season.budget_cents / 100) : String(season.budget_cents / 100).replace(".", ",")) : ""}
          placeholder="15000"
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-4 col-span-2">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? te.saving : season ? te.saveChanges : te.addSeason}
        </button>
      </div>
    </form>
  );
}
