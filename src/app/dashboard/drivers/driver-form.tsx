"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";

import { createDriver, updateDriver } from "../track-actions";

const initialState: FormState = {};

export type DriverValues = {
  id: string;
  first_name: string;
  last_name: string | null;
  race_number: string | null;
  weight_kg: number | null;
  licence_number: string | null;
};

/** Adds a driver, or edits one when `driver` is given. */
export function DriverForm({ driver }: { driver?: DriverValues }) {
  const [state, formAction, isPending] = useActionState(
    driver ? updateDriver.bind(null, driver.id) : createDriver,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className={labelClass}>
        Voornaam *
        <input name="first_name" required defaultValue={driver?.first_name} placeholder="Sam" className={inputClass} />
      </label>
      <label className={labelClass}>
        Achternaam
        <input name="last_name" defaultValue={driver?.last_name ?? ""} placeholder="de Vries" className={inputClass} />
      </label>
      <label className={labelClass}>
        Startnummer
        <input name="race_number" defaultValue={driver?.race_number ?? ""} placeholder="33" className={inputClass} />
      </label>
      <label className={labelClass}>
        Gewicht (kg)
        <input
          name="weight_kg"
          inputMode="decimal"
          defaultValue={driver?.weight_kg != null ? String(driver.weight_kg).replace(".", ",") : ""}
          placeholder="68,5"
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Licentienummer
        <input name="licence_number" defaultValue={driver?.licence_number ?? ""} className={inputClass} />
      </label>
      <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-4">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : driver ? "Wijzigingen opslaan" : "Coureur toevoegen"}
        </button>
      </div>
    </form>
  );
}
