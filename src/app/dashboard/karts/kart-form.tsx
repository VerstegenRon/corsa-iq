"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";

import { createKart } from "../actions";

const initialState: FormState = {};

export function KartForm() {
  const [state, formAction, isPending] = useActionState(createKart, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>
        Naam *
        <input name="name" required placeholder="Kart A" className={inputClass} />
      </label>
      <label className={labelClass}>
        Klasse
        <input name="class" placeholder="Rotax Max Senior" className={inputClass} />
      </label>
      <label className={labelClass}>
        Chassismerk
        <input name="chassis_brand" placeholder="Tony Kart" className={inputClass} />
      </label>
      <label className={labelClass}>
        Model
        <input name="chassis_model" placeholder="Racer 401 RR" className={inputClass} />
      </label>
      <label className={labelClass}>
        Bouwjaar
        <input name="chassis_year" inputMode="numeric" placeholder="2026" className={inputClass} />
      </label>
      <label className={labelClass}>
        Chassisnummer
        <input name="serial_number" className={inputClass} />
      </label>

      <div className="flex flex-col gap-4 sm:col-span-2">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : "Kart toevoegen"}
        </button>
      </div>
    </form>
  );
}
