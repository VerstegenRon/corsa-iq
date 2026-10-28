"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { PART_CATEGORIES } from "@/lib/karting";

import { createPart } from "../actions";

const initialState: FormState = {};

export function PartForm() {
  const [state, formAction, isPending] = useActionState(createPart, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className={labelClass}>
        Categorie *
        <select name="category" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Kies…
          </option>
          {Object.entries(PART_CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Merk
        <input name="brand" placeholder="Vortex, MG, OTK…" className={inputClass} />
      </label>
      <label className={labelClass}>
        Model / type
        <input name="model" placeholder="Rok GP, SM Red…" className={inputClass} />
      </label>
      <label className={labelClass}>
        Serie- of motornummer
        <input name="serial_number" className={inputClass} />
      </label>
      <label className={labelClass}>
        Aankoopdatum
        <input name="purchased_on" type="date" className={inputClass} />
      </label>
      <label className={labelClass}>
        Aankoopprijs (€)
        <input name="purchase_price" inputMode="decimal" placeholder="249,95" className={inputClass} />
      </label>
      <label className={labelClass}>
        Revisie of vervangen na (uren)
        <input name="usage_limit_hours" inputMode="decimal" placeholder="10" className={inputClass} />
      </label>
      <label className={`${labelClass} sm:col-span-2`}>
        Notities
        <input name="notes" className={inputClass} />
      </label>

      <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : "Onderdeel toevoegen"}
        </button>
      </div>
    </form>
  );
}
