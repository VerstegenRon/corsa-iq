"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { useT } from "@/lib/i18n/client";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { sortByLabel, sortedEntries } from "@/lib/karting";
import { removeReceipt, uploadReceipt } from "@/lib/receipt-upload";
import { RECEIPT_ACCEPT } from "@/lib/storage";

import { createExpense } from "../expense-actions";

const initialState: FormState = {};

type Option = { id: string; label: string };

/**
 * Pass `eventId` to book every expense on that event (and its season); otherwise the driver
 * picks a season and optionally an event.
 */
export function ExpenseForm({
  garageId,
  defaultDate,
  eventId,
  seasons = [],
  events = [],
  defaultSeasonId,
}: {
  garageId: string;
  defaultDate: string;
  eventId?: string;
  seasons?: Option[];
  events?: Option[];
  defaultSeasonId?: string;
}) {
  // Upload the receipt from the browser first, then hand only its storage path to the server.
  const t = useT();
  const [state, formAction, isPending] = useActionState(async (prev: FormState, formData: FormData) => {
    const file = formData.get("receipt");
    formData.delete("receipt");
    if (!(file instanceof File) || file.size === 0) return createExpense(prev, formData);

    const upload = await uploadReceipt(garageId, file);
    if ("error" in upload) return { error: upload.error };
    formData.set("receipt_path", upload.path);
    const result = await createExpense(prev, formData);
    if (result.error) await removeReceipt(upload.path);
    return result;
  }, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className={labelClass}>
        Categorie *
        <select name="category" required defaultValue="entry_fee" className={inputClass}>
          {sortedEntries(t.options.expenseCategories).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Bedrag (€) *
        <input name="amount" required inputMode="decimal" placeholder="85,00" className={inputClass} />
      </label>
      <label className={labelClass}>
        Datum *
        <input name="spent_on" type="date" required defaultValue={defaultDate} className={inputClass} />
      </label>

      {eventId ? (
        <input type="hidden" name="event_id" value={eventId} />
      ) : (
        <>
          <label className={labelClass}>
            Seizoen
            <select name="season_id" defaultValue={defaultSeasonId ?? ""} className={inputClass}>
              <option value="">Geen seizoen</option>
              {sortByLabel(seasons).map((season) => (
                <option key={season.id} value={season.id}>
                  {season.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Evenement
            <select name="event_id" defaultValue="" className={inputClass}>
              <option value="">Geen evenement</option>
              {sortByLabel(events).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className={`${labelClass} sm:col-span-2 lg:col-span-1`}>
        Omschrijving
        <input name="description" placeholder="Inschrijving NK ronde 1" className={inputClass} />
      </label>
      <label className={`${labelClass} sm:col-span-2`}>
        Bonnetje (foto of pdf)
        <input
          name="receipt"
          type="file"
          accept={RECEIPT_ACCEPT}
          className={`${inputClass} py-2.5 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-800 file:px-3 file:py-0.5 file:text-sm file:text-zinc-200`}
        />
      </label>

      <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : "Uitgave toevoegen"}
        </button>
      </div>
    </form>
  );
}
