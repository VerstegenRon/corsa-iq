"use client";

import { useActionState, useEffect, useRef } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, primaryButtonClass } from "@/components/ui";
import { CHECKLIST_CATEGORIES } from "@/lib/checklist";

const initialState: FormState = {};

/** One line to add an item: what, and in which category. Used for the fixed list and for one event. */
export function ChecklistItemForm({
  action,
  submitLabel = "Toevoegen",
  defaultCategory = "other",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
  defaultCategory?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Ready for the next item: empty the title, keep the category.
  useEffect(() => {
    if (!state.success || !titleRef.current) return;
    titleRef.current.value = "";
    titleRef.current.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={titleRef}
          name="title"
          required
          maxLength={120}
          aria-label="Wat moet er mee?"
          placeholder="Bijvoorbeeld: reservebougie"
          className={`${inputClass} sm:flex-1`}
        />
        <select name="category" aria-label="Categorie" defaultValue={defaultCategory} className={`${inputClass} sm:w-56`}>
          {Object.entries(CHECKLIST_CATEGORIES).map(([value, category]) => (
            <option key={value} value={value}>
              {category.label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} shrink-0`}>
          {isPending ? "Bezig…" : submitLabel}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
