"use client";

import { useActionState, useState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { useT } from "@/lib/i18n/client";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { sortedEntries } from "@/lib/karting";

import { createMaintenance, type MaintenanceTarget } from "../actions";
import type { ComponentSet } from "./maintenance-sections";

const initialState: FormState = {};

export function MaintenanceForm({
  target,
  componentSet,
  today,
}: {
  target: MaintenanceTarget;
  componentSet: ComponentSet | null;
  today: string;
}) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(createMaintenance.bind(null, target), initialState);
  const [type, setType] = useState("revision");
  const te = t.equipment;
  const text = te.maintenanceCopy[target.kind];
  const components = componentSet === "engine" ? t.options.engineComponents : componentSet === "chassis" ? t.options.chassisComponents : null;

  return (
    <form action={formAction} className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-3">
      <label className={labelClass}>
        {te.date}
        <input name="performed_on" type="date" required defaultValue={today} className={inputClass} />
      </label>
      <label className={labelClass}>
        {te.kind}
        <select name="type" required value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          {sortedEntries(t.options.maintenanceTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {te.performedBy}
        <input name="performed_by" placeholder={text.byPlaceholder} className={inputClass} />
      </label>

      {components && (
        <fieldset className="col-span-2 lg:col-span-3">
          <legend className="text-sm text-zinc-300">{te.replaced}</legend>
          <p className="mt-1 text-xs text-zinc-500">{text.componentsHelp}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {sortedEntries(components).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" name="components" value={value} className="size-4 accent-brand-400" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex items-start gap-2 text-sm text-zinc-300 col-span-2 lg:col-span-3">
        {/* Keyed on the type, so switching to "Revisie" checks it again and other types start unchecked. */}
        <input
          key={type}
          type="checkbox"
          name="resets_usage"
          defaultChecked={type === "revision"}
          className="mt-0.5 size-4 accent-brand-400"
        />
        <span>
          {text.reset}
          <span className="block text-xs text-zinc-500">{text.resetHelp}</span>
        </span>
      </label>

      <label className={`${labelClass} col-span-2`}>
        {te.description}
        <input name="description" placeholder={text.descriptionPlaceholder} className={inputClass} />
      </label>
      <label className={labelClass}>
        {te.cost}
        <input name="cost" inputMode="decimal" placeholder="350" className={inputClass} />
      </label>

      <div className="flex flex-col gap-4 col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? te.saving : te.logMaintenance}
        </button>
      </div>
    </form>
  );
}
