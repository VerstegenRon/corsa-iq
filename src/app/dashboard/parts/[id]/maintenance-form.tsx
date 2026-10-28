"use client";

import { useActionState, useState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { useT } from "@/lib/i18n/client";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { sortedEntries } from "@/lib/karting";

import { createMaintenance } from "../../actions";

const initialState: FormState = {};

export function MaintenanceForm({ partId, isEngine, today }: { partId: string; isEngine: boolean; today: string }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(createMaintenance.bind(null, partId), initialState);
  const [type, setType] = useState("revision");

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className={labelClass}>
        Datum *
        <input name="performed_on" type="date" required defaultValue={today} className={inputClass} />
      </label>
      <label className={labelClass}>
        Soort *
        <select name="type" required value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          {sortedEntries(t.options.maintenanceTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Uitgevoerd door
        <input name="performed_by" placeholder="Zelf, of je motorbouwer" className={inputClass} />
      </label>

      {isEngine && (
        <fieldset className="sm:col-span-2 lg:col-span-3">
          <legend className="text-sm text-zinc-300">Vervangen of gereviseerd</legend>
          <p className="mt-1 text-xs text-zinc-500">
            Elk aangevinkt component begint opnieuw te tellen. De totale draaitijd van de motor loopt altijd door.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {sortedEntries(t.options.engineComponents).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" name="components" value={value} className="size-4 accent-cyan-400" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex items-start gap-2 text-sm text-zinc-300 sm:col-span-2 lg:col-span-3">
        {/* Keyed on the type, so switching to "Revisie" checks it again and other types start unchecked. */}
        <input
          key={type}
          type="checkbox"
          name="resets_usage"
          defaultChecked={type === "revision"}
          className="mt-0.5 size-4 accent-cyan-400"
        />
        <span>
          Teller “sinds laatste revisie” op nul zetten
          <span className="block text-xs text-zinc-500">
            Gebruik dit bij een volledige revisie; daarmee wordt ook de revisiegrens opnieuw gemeten.
          </span>
        </span>
      </label>

      <label className={`${labelClass} sm:col-span-2`}>
        Omschrijving
        <input name="description" placeholder="Nieuwe zuiger 54,00 mm, big-end vervangen…" className={inputClass} />
      </label>
      <label className={labelClass}>
        Kosten (€)
        <input name="cost" inputMode="decimal" placeholder="350" className={inputClass} />
      </label>

      <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : "Onderhoud vastleggen"}
        </button>
      </div>
    </form>
  );
}
