"use client";

import { useActionState, useRef, useState } from "react";

import { ChoiceChips, MoreDetails } from "@/components/form-controls";
import { FormMessage, type FormState } from "@/components/form-message";
import { EXPENSE_ICONS, Icon, iconFor } from "@/components/icons";
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
      // A category is a group of radio buttons (RadioNodeList); setting its value checks that one.
      if (value && (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof RadioNodeList)) {
        element.value = value;
      }
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
      <label
        className={`col-span-2 flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-zinc-700 p-4 transition-colors hover:border-brand-400/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-400 lg:col-span-3 ${
          reading.busy ? "opacity-60" : ""
        }`}
      >
        <span aria-hidden="true" className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-on-brand">
          <Icon name="camera" className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-zinc-100">{reading.busy ? "Bonnetje lezen…" : "Foto of pdf van je bonnetje"}</span>
          <span className="block text-xs text-zinc-500">We vullen bedrag, datum en categorie voor je in.</span>
        </span>
        <input
          name="receipt"
          type="file"
          accept={RECEIPT_ACCEPT}
          onChange={onReceiptChange}
          disabled={reading.busy}
          className="sr-only"
        />
      </label>
      {(reading.message || reading.error) && (
        <p role="status" className={`col-span-2 text-sm lg:col-span-3 ${reading.error ? "text-amber-300" : "text-brand-300"}`}>
          {reading.error ?? reading.message}
        </p>
      )}

      <ChoiceChips
        name="category"
        legend="Categorie"
        required
        variant="tiles"
        defaultValue="entry_fee"
        options={sortedEntries(t.options.expenseCategories).map(([value, label]) => ({ value, label, icon: iconFor(EXPENSE_ICONS, value) }))}
      />
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
        <MoreDetails title="Seizoen en evenement">
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
        </MoreDetails>
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
