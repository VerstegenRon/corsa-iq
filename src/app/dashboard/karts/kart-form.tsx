"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { KART_STATUSES, sortedEntries } from "@/lib/karting";

import { createKart, updateKart } from "../actions";

const initialState: FormState = {};

export type KartValues = {
  id: string;
  name: string;
  class: string | null;
  chassis_brand: string | null;
  chassis_model: string | null;
  chassis_year: number | null;
  serial_number: string | null;
  status: string;
};

/** Adds a kart, or edits one when `kart` is given. */
export function KartForm({ kart }: { kart?: KartValues }) {
  const [state, formAction, isPending] = useActionState(
    kart ? updateKart.bind(null, kart.id) : createKart,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>
        Naam *
        <input name="name" required defaultValue={kart?.name} placeholder="Kart A" className={inputClass} />
      </label>
      <label className={labelClass}>
        Klasse
        <input name="class" defaultValue={kart?.class ?? ""} placeholder="Rotax Max Senior" className={inputClass} />
      </label>
      <label className={labelClass}>
        Chassismerk
        <input name="chassis_brand" defaultValue={kart?.chassis_brand ?? ""} placeholder="Tony Kart" className={inputClass} />
      </label>
      <label className={labelClass}>
        Model
        <input name="chassis_model" defaultValue={kart?.chassis_model ?? ""} placeholder="Racer 401 RR" className={inputClass} />
      </label>
      <label className={labelClass}>
        Bouwjaar
        <input
          name="chassis_year"
          inputMode="numeric"
          defaultValue={kart?.chassis_year ?? ""}
          placeholder="2026"
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Chassisnummer
        <input name="serial_number" defaultValue={kart?.serial_number ?? ""} className={inputClass} />
      </label>
      {kart && (
        <label className={labelClass}>
          Status
          <select name="status" defaultValue={kart.status} className={inputClass}>
            {sortedEntries(KART_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-col gap-4 sm:col-span-2">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : kart ? "Wijzigingen opslaan" : "Kart toevoegen"}
        </button>
      </div>
    </form>
  );
}
