"use client";

import { useActionState, useEffect, useRef } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";

import { createCalendarItem, updateCalendarItem } from "../agenda-actions";

const initialState: FormState = {};

export type CalendarItemValues = {
  id: string;
  title: string;
  starts_on: string;
  ends_on: string | null;
  starts_at: string | null;
  notes: string | null;
};

/** Adds an appointment, or edits one when `item` is given. */
export function CalendarItemForm({ item, defaultDate }: { item?: CalendarItemValues; defaultDate?: string }) {
  const [state, formAction, isPending] = useActionState(item ? updateCalendarItem.bind(null, item.id) : createCalendarItem, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // A new appointment starts from an empty form again once it is saved.
  useEffect(() => {
    if (!item && state.success) formRef.current?.reset();
  }, [item, state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
      <label className={`${labelClass} col-span-2 sm:col-span-4`}>
        Titel *
        <input name="title" required maxLength={120} defaultValue={item?.title} placeholder="Motor naar de tuner" className={inputClass} />
      </label>
      <label className={labelClass}>
        Datum *
        <input type="date" name="starts_on" required defaultValue={item?.starts_on ?? defaultDate} className={inputClass} />
      </label>
      <label className={labelClass}>
        Tijd
        <input type="time" name="starts_at" defaultValue={item?.starts_at?.slice(0, 5) ?? ""} className={inputClass} />
      </label>
      <label className={`${labelClass} col-span-2`}>
        Tot en met (meerdere dagen)
        <input type="date" name="ends_on" defaultValue={item?.ends_on ?? ""} className={inputClass} />
      </label>
      <label className={`${labelClass} col-span-2 sm:col-span-4`}>
        Notitie
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={item?.notes ?? ""}
          placeholder="Ophalen bij Kartshop, bon meenemen"
          className={`${inputClass} h-auto py-3`}
        />
      </label>
      <div className="col-span-2 flex flex-col gap-4 sm:col-span-4">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : item ? "Wijzigingen opslaan" : "Afspraak toevoegen"}
        </button>
      </div>
    </form>
  );
}
