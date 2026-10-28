"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { useT } from "@/lib/i18n/client";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { sortedEntries } from "@/lib/karting";

import { createPart, updatePart } from "../actions";

const initialState: FormState = {};

export type PartValues = {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchased_on: string | null;
  purchase_price_cents: number | null;
  usage_limit_minutes: number | null;
  notes: string | null;
  status: string;
};

/** "249,95" for the price field, so it reads like the placeholder. */
const decimal = (value: number | null, divisor: number) =>
  value === null ? "" : String(value / divisor).replace(".", ",");

/** Adds a part, or edits one when `part` is given. */
export function PartForm({ part }: { part?: PartValues }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(
    part ? updatePart.bind(null, part.id) : createPart,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className={labelClass}>
        Categorie *
        <select name="category" required defaultValue={part?.category ?? ""} className={inputClass}>
          <option value="" disabled>
            Kies…
          </option>
          {sortedEntries(t.options.partCategories).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Merk
        <input name="brand" defaultValue={part?.brand ?? ""} placeholder="Vortex, MG, OTK…" className={inputClass} />
      </label>
      <label className={labelClass}>
        Model / type
        <input name="model" defaultValue={part?.model ?? ""} placeholder="Rok GP, SM Red…" className={inputClass} />
      </label>
      <label className={labelClass}>
        Serie- of motornummer
        <input name="serial_number" defaultValue={part?.serial_number ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Aankoopdatum
        <input name="purchased_on" type="date" defaultValue={part?.purchased_on ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Aankoopprijs (€)
        <input
          name="purchase_price"
          inputMode="decimal"
          defaultValue={part ? decimal(part.purchase_price_cents, 100) : undefined}
          placeholder="249,95"
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Revisie of vervangen na (uren)
        <input
          name="usage_limit_hours"
          inputMode="decimal"
          defaultValue={part ? decimal(part.usage_limit_minutes, 60) : undefined}
          placeholder="10"
          className={inputClass}
        />
      </label>
      {part && (
        <label className={labelClass}>
          Status
          {part.status === "installed" ? (
            <>
              <input name="status" type="hidden" value="installed" />
              <span className={`${inputClass} flex items-center text-zinc-400`}>Gemonteerd (demonteer via de kart)</span>
            </>
          ) : (
            <select name="status" defaultValue={part.status} className={inputClass}>
              {sortedEntries(t.options.partStatuses)
                .filter(([value]) => value !== "installed")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          )}
        </label>
      )}
      <label className={`${labelClass} sm:col-span-2`}>
        Notities
        <input name="notes" defaultValue={part?.notes ?? ""} className={inputClass} />
      </label>

      <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : part ? "Wijzigingen opslaan" : "Onderdeel toevoegen"}
        </button>
      </div>
    </form>
  );
}
