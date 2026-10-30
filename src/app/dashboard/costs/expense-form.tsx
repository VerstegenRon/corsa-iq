"use client";

import { useActionState, useRef, useState } from "react";

import { ChoiceChips, MoreDetails } from "@/components/form-controls";
import { FormMessage, type FormState } from "@/components/form-message";
import { EXPENSE_ICONS, Icon, iconFor } from "@/components/icons";
import { useLocale, useT } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/locales";
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
  readLocked,
}: {
  garageId: string;
  defaultDate: string;
  eventId?: string;
  seasons?: Option[];
  events?: Option[];
  defaultSeasonId?: string;
  /** Why the receipt is only stored, not read (a plan without it); null when it is read. */
  readLocked?: string | null;
}) {
  const t = useT();
  const tc = t.costs;
  const locale = useLocale();
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

    setReading({ busy: true, message: tc.receiptUploading });
    const upload = await uploadReceipt(garageId, file, tc);
    if ("error" in upload) return setReading({ error: upload.error });
    receiptPath.current = upload.path;
    if (readLocked) return setReading({ message: `${readLocked} ${tc.receiptKept}` });

    setReading({ busy: true, message: tc.receiptParsing });
    const result = await readUploadedReceipt(upload.path);
    if ("error" in result) return setReading({ error: `${result.error} ${tc.receiptKept}` });

    const { fields } = result;
    const form = formRef.current;
    const set = (name: string, value: string | null) => {
      const element = form?.elements.namedItem(name);
      // A category is a group of radio buttons (RadioNodeList); setting its value checks that one.
      if (value && (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof RadioNodeList)) {
        element.value = value;
      }
    };
    // English writes a decimal point; the other languages a comma.
    const amount = fields.amount?.toFixed(2) ?? null;
    set("amount", amount && locale !== "en" ? amount.replace(".", ",") : amount);
    set("spent_on", fields.date);
    set("description", fields.description);
    set("category", fields.category);
    const foreign = fields.currency && fields.currency !== "EUR";
    setReading({
      message: foreign
        ? format(tc.receiptForeign, { currency: fields.currency! })
        : tc.receiptFilled,
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
          <span className="block font-semibold text-zinc-100">{reading.busy ? tc.receiptReading : tc.receiptPrompt}</span>
          <span className="block text-xs text-zinc-500">{tc.receiptHint}</span>
        </span>
        <input name="receipt" type="file" accept={RECEIPT_ACCEPT} onChange={onReceiptChange} disabled={reading.busy} className="sr-only" />
      </label>
      {(reading.message || reading.error) && (
        <p role="status" className={`col-span-2 text-sm lg:col-span-3 ${reading.error ? "text-amber-300" : "text-brand-300"}`}>
          {reading.error ?? reading.message}
        </p>
      )}

      <ChoiceChips
        name="category"
        legend={tc.category}
        required
        variant="tiles"
        defaultValue="entry_fee"
        options={sortedEntries(t.options.expenseCategories).map(([value, label]) => ({ value, label, icon: iconFor(EXPENSE_ICONS, value) }))}
      />
      <label className={labelClass}>
        {tc.amount}
        <input name="amount" required inputMode="decimal" placeholder={tc.amountPlaceholder} className={inputClass} />
      </label>
      <label className={labelClass}>
        {tc.date}
        <input name="spent_on" type="date" required defaultValue={defaultDate} className={inputClass} />
      </label>

      {eventId ? (
        <input type="hidden" name="event_id" value={eventId} />
      ) : (
        <MoreDetails title={tc.seasonAndEvent}>
          <label className={`${labelClass} col-span-2 sm:col-span-1`}>
            {tc.season}
            <select name="season_id" defaultValue={defaultSeasonId ?? ""} className={inputClass}>
              <option value="">{tc.noSeason}</option>
              {sortByLabel(seasons).map((season) => (
                <option key={season.id} value={season.id}>
                  {season.label}
                </option>
              ))}
            </select>
          </label>
          <label className={`${labelClass} col-span-2 sm:col-span-1`}>
            {tc.event}
            <select name="event_id" defaultValue="" className={inputClass}>
              <option value="">{tc.noEvent}</option>
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
        {tc.description}
        <input name="description" placeholder={tc.descriptionPlaceholder} className={inputClass} />
      </label>

      <div className="flex flex-col gap-4 col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending || reading.busy} className={`${primaryButtonClass} self-start`}>
          {isPending ? tc.saving : tc.addExpense}
        </button>
      </div>
    </form>
  );
}
