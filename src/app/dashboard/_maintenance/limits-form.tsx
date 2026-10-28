"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { decimalInput, sortedEntries } from "@/lib/karting";
import type { ComponentLimits } from "@/lib/part-usage";

import { updateComponentLimits, type MaintenanceTarget } from "../actions";
import type { ComponentSet } from "./maintenance-sections";

const initialState: FormState = {};

/** One hours field per component; empty means no limit for that component. */
export function LimitsForm({
  target,
  componentSet,
  limits,
}: {
  target: MaintenanceTarget;
  componentSet: ComponentSet;
  limits: ComponentLimits;
}) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(updateComponentLimits.bind(null, target), initialState);
  const components = componentSet === "engine" ? t.options.engineComponents : t.options.chassisComponents;

  return (
    <form action={formAction} className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4">
      {sortedEntries(components).map(([key, label]) => (
        <label key={key} className={labelClass}>
          {label}
          <input
            name={`limit_${key}`}
            inputMode="decimal"
            defaultValue={decimalInput(limits[key], 60)}
            placeholder="uren"
            className={inputClass}
          />
        </label>
      ))}
      <div className="flex flex-col gap-4 col-span-2 lg:col-span-4">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : "Grenzen opslaan"}
        </button>
      </div>
    </form>
  );
}
