"use client";

import { useActionState, useRef, useState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { useT } from "@/lib/i18n/client";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { sortByLabel, sortedEntries } from "@/lib/karting";
import { removeReceipt, uploadReceipt } from "@/lib/receipt-upload";
import { RECEIPT_ACCEPT } from "@/lib/storage";

import { createExpense, readUploadedReceipt } from "../expense-actions";

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
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);
  // A picked receipt is uploaded and read straight away; the form then only sends its storage path.
  // A ref, not state: the handlers must always see the latest upload, also between renders.
  const receiptPath = useRef<string | null>(null);
  const [reading, setReading] = useState<{ busy?: boolean; message?: string; error?: string }>({});

  async function onReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (receiptPath.current) await removeReceipt(receiptPath.current);
    receiptPath.current = null;
    if (!file) return setReading({});

    setReading({ busy: true, message: "Bonnetje uploaden…" });
    const upload = await uploadReceipt(garageId, file);
    if ("error" in upload) return setReading({ error: upload.error });
    receiptPath.current = upload.path;

    setReading({ busy: true, message: "Bonnetje inlezen…" });
    const result = await readUploadedReceipt(upload.path);
    if ("error" in result) return setReading({ error: `${result.error} Het bonnetje wordt wel bewaard.` });

    const { fields } = result;
    const form = formRef.current;
    const set = (name: string, value: string | null) => {
      const element = form?.elements.namedItem(name);
      if (value && (element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) element.value = value;
    };
    set("amount", fields.amount === null ? null : fields.amount.toFixed(2).replace(".", ","));
    set("spent_on", fields.date);
    set("description", fields.description);
    set("category", fields.category);
    const foreign = fields.currency && fields.currency !== "EUR";
    setReading({
      message: foreign
        ? `Ingevuld uit het bonnetje. Let op: het bedrag is in ${fields.currency}; reken het om naar euro’s.`
        : "Ingevuld uit het bonnetje. Controleer de gegevens en sla op.",
    });
  }

  const [state, formAction, isPending] = useActionState(async (prev: FormState, formData: FormData) => {
    formData.delete("receipt");
    if (receiptPath.current) formData.set("receipt_path", receiptPath.current);
    const result = await createExpense(prev, formData);
    if (!result.error) {
      // The form resets after a successful save; the receipt now belongs to the saved expense.
      receiptPath.current = null;
      setReading({});
    }
    return result;
  }, initialState);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-3">
      <label className={`${labelClass} col-span-2 lg:col-span-3`}>
        <span>
          Bonnetje of factuur (foto of pdf)
          <span className="block text-xs text-zinc-500">Kies je een bestand, dan vullen we bedrag, datum, omschrijving en categorie voor je in.</span>
        </span>
        <input
          name="receipt"
          type="file"
          accept={RECEIPT_ACCEPT}
          onChange={onReceiptChange}
          disabled={reading.busy}
          className={`${inputClass} py-2.5 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-800 file:px-3 file:py-0.5 file:text-sm file:text-zinc-200`}
        />
      </label>
      {(reading.message || reading.error) && (
        <p role="status" className={`col-span-2 text-sm lg:col-span-3 ${reading.error ? "text-amber-300" : "text-brand-300"}`}>
          {reading.error ?? reading.message}
        </p>
      )}

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
          <label className={`${labelClass} col-span-2 sm:col-span-1`}>
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
          <label className={`${labelClass} col-span-2 sm:col-span-1`}>
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

      <label className={`${labelClass} col-span-2 lg:col-span-1`}>
        Omschrijving
        <input name="description" placeholder="Inschrijving NK ronde 1" className={inputClass} />
      </label>


      <div className="flex flex-col gap-4 col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending || reading.busy} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : "Uitgave toevoegen"}
        </button>
      </div>
    </form>
  );
}
