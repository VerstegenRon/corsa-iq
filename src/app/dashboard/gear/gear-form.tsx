"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { HOMOLOGATION_SUGGESTIONS } from "@/lib/gear";
import { useT } from "@/lib/i18n/client";
import { decimalInput, sortByLabel, sortedEntries } from "@/lib/karting";

import { createGear, updateGear } from "../gear-actions";

const initialState: FormState = {};

export type GearValues = {
  id: string;
  category: string;
  driver_id: string | null;
  brand: string | null;
  model: string | null;
  size: string | null;
  homologation: string | null;
  valid_until: string | null;
  status: string;
  purchased_on: string | null;
  purchase_price_cents: number | null;
  notes: string | null;
};

/** Adds a gear item, or edits one when `gear` is given. */
export function GearForm({ drivers, gear }: { drivers: { id: string; label: string }[]; gear?: GearValues }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(gear ? updateGear.bind(null, gear.id) : createGear, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-3">
      <label className={labelClass}>
        Soort *
        <select name="category" required defaultValue={gear?.category ?? ""} className={inputClass}>
          <option value="" disabled>
            Kies…
          </option>
          {sortedEntries(t.options.gearCategories).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Coureur
        <select name="driver_id" defaultValue={gear?.driver_id ?? drivers[0]?.id ?? ""} className={inputClass}>
          <option value="">Geen / gedeeld</option>
          {sortByLabel(drivers).map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Status
        <select name="status" defaultValue={gear?.status ?? "in_use"} className={inputClass}>
          {Object.entries(t.options.gearStatuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Merk
        <input name="brand" defaultValue={gear?.brand ?? ""} placeholder="Bell, Arai, Sparco…" className={inputClass} />
      </label>
      <label className={labelClass}>
        Model
        <input name="model" defaultValue={gear?.model ?? ""} placeholder="KC7-CMR, X-Light…" className={inputClass} />
      </label>
      <label className={labelClass}>
        Maat
        <input name="size" defaultValue={gear?.size ?? ""} placeholder="M, 58, 42…" className={inputClass} />
      </label>
      <label className={labelClass}>
        Homologatie
        <input
          name="homologation"
          list="homologations"
          defaultValue={gear?.homologation ?? ""}
          placeholder="Snell K2020"
          className={inputClass}
        />
        <datalist id="homologations">
          {HOMOLOGATION_SUGGESTIONS.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </label>
      <label className={labelClass}>
        Homologatie geldig tot
        <input name="valid_until" type="date" defaultValue={gear?.valid_until ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Aankoopdatum
        <input name="purchased_on" type="date" defaultValue={gear?.purchased_on ?? ""} className={inputClass} />
      </label>
      <label className={labelClass}>
        Aankoopprijs (€)
        <input
          name="purchase_price"
          inputMode="decimal"
          defaultValue={gear ? decimalInput(gear.purchase_price_cents, 100) : undefined}
          placeholder="449,95"
          className={inputClass}
        />
      </label>
      <label className={`${labelClass} col-span-2`}>
        Notities
        <input name="notes" defaultValue={gear?.notes ?? ""} className={inputClass} />
      </label>
      <div className="col-span-2 flex flex-col gap-4 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : gear ? "Wijzigingen opslaan" : "Toevoegen"}
        </button>
      </div>
    </form>
  );
}
