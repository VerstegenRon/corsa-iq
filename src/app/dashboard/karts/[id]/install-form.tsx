"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { sortByLabel } from "@/lib/karting";

import { installPart } from "../../actions";

const initialState: FormState = {};

type Option = { id: string; label: string };

export function InstallForm({ kartId, options }: { kartId: string; options: Option[] }) {
  const te = useT().equipment;
  const [state, formAction, isPending] = useActionState(installPart.bind(null, kartId), initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className={`${labelClass} flex-1`}>
          {te.fromStock}
          <select name="part_id" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              {te.choose}
            </option>
            {sortByLabel(options).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? te.mounting : te.mount}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
