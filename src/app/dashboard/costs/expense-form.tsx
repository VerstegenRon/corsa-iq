"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { EXPENSE_CATEGORIES } from "@/lib/karting";

import { createExpense } from "../expense-actions";

const initialState: FormState = {};

type Option = { id: string; label: string };

/**
 * Pass `eventId` to book every expense on that event (and its season); otherwise the driver
 * picks a season and optionally an event.
 */
export function ExpenseForm({
  defaultDate,
  eventId,
  seasons = [],
  events = [],
  defaultSeasonId,
}: {
  defaultDate: string;
  eventId?: string;
  seasons?: Option[];
  events?: Option[];
  defaultSeasonId?: string;
}) {
  const [state, formAction, isPending] = useActionState(createExpense, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className={labelClass}>
        Categorie *
        <select name="category" required defaultValue="entry_fee" className={inputClass}>
          {Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => (
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
              {seasons.map((season) => (
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
              {events.map((event) => (
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

      <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-3">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? "Opslaan…" : "Uitgave toevoegen"}
        </button>
      </div>
    </form>
  );
}
