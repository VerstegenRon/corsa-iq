"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { useT } from "@/lib/i18n/client";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { ChoiceChips, MoreDetails } from "@/components/form-controls";
import { PART_ICONS, iconFor } from "@/components/icons";
import { decimalInput, sortedEntries } from "@/lib/karting";

import { createPart, updatePart } from "../actions";

const initialState: FormState = {};

export type PartValues = {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchased_on: string | null;
  purchase_price_cents: number | null;
  usage_limit_minutes: number | null;
  notes: string | null;
  status: string;
};

/** Adds a part, or edits one when `part` is given. */
export function PartForm({ part }: { part?: PartValues }) {
  const t = useT();
  const te = t.equipment;
  const [state, formAction, isPending] = useActionState(
    part ? updatePart.bind(null, part.id) : createPart,
    initialState,
  );

  return (
    <form action={formAction} className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-3">
      <ChoiceChips
        name="category"
        legend={te.whatIsIt}
        required
        variant="tiles"
        defaultValue={part?.category}
        options={sortedEntries(t.options.partCategories).map(([value, label]) => ({ value, label, icon: iconFor(PART_ICONS, value) }))}
      />
      <label className={labelClass}>
        {te.brand}
        <input name="brand" defaultValue={part?.brand ?? ""} placeholder={te.brandPlaceholder} className={inputClass} />
      </label>
      <label className={labelClass}>
        {te.modelType}
        <input name="model" defaultValue={part?.model ?? ""} placeholder={te.modelPlaceholder} className={inputClass} />
      </label>
      <label className={labelClass}>
        {te.price}
        <input
          name="purchase_price"
          inputMode="decimal"
          defaultValue={part ? decimalInput(part.purchase_price_cents, 100) : undefined}
          placeholder="249,95"
          className={inputClass}
        />
      </label>
      {part && (
        <label className={labelClass}>
          {te.status}
          {part.status === "installed" ? (
            <>
              <input name="status" type="hidden" value="installed" />
              <span className={`${inputClass} flex items-center text-zinc-400`}>{te.mountedViaKart}</span>
            </>
          ) : (
            <select name="status" defaultValue={part.status} className={inputClass}>
              {sortedEntries(t.options.partStatuses)
                .filter(([value]) => value !== "installed")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          )}
        </label>
      )}
      <MoreDetails defaultOpen={Boolean(part && (part.serial_number || part.purchased_on || part.usage_limit_minutes || part.notes))}>
        <label className={labelClass}>
          {te.serialNumber}
          <input name="serial_number" defaultValue={part?.serial_number ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {te.purchasedOn}
          <input name="purchased_on" type="date" defaultValue={part?.purchased_on ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          {te.revisionAfter}
          <input
            name="usage_limit_hours"
            inputMode="decimal"
            defaultValue={part ? decimalInput(part.usage_limit_minutes, 60) : undefined}
            placeholder="10"
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} col-span-2`}>
          {te.notes}
          <input name="notes" defaultValue={part?.notes ?? ""} className={inputClass} />
        </label>
      </MoreDetails>

      <div className="flex flex-col gap-4 col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? te.saving : part ? te.saveChanges : te.addPart}
        </button>
      </div>
    </form>
  );
}
