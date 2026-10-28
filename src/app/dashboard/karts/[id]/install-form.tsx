"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";

import { installPart } from "../../actions";

const initialState: FormState = {};

type Option = { id: string; label: string };

export function InstallForm({ kartId, options }: { kartId: string; options: Option[] }) {
  const [state, formAction, isPending] = useActionState(installPart.bind(null, kartId), initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className={`${labelClass} flex-1`}>
          Onderdeel uit voorraad
          <select name="part_id" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Kies…
            </option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "Monteren…" : "Monteren"}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
