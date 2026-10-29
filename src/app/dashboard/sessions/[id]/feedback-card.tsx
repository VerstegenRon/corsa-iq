"use client";

// Driver feedback straight on the session page, so it can be spoken in right after the session
// without opening the full edit form.

import { useActionState, type ReactNode } from "react";

import { FeedbackField } from "@/components/feedback-field";
import { FormMessage, type FormState } from "@/components/form-message";
import { Icon } from "@/components/icons";
import { QuickTagToggles } from "@/components/quick-tags";
import { cardClass, primaryButtonClass } from "@/components/ui";
import type { QuickTag } from "@/lib/feedback";

import { saveFeedback } from "../../season-actions";

const initialState: FormState = {};

export function FeedbackCard({ sessionId, feedback, quick, tags }: { sessionId: string; feedback: string | null; quick: QuickTag[]; tags: ReactNode }) {
  const [state, formAction, isPending] = useActionState(saveFeedback.bind(null, sessionId), initialState);

  return (
    <section aria-labelledby="feedback-heading" className={cardClass}>
      <h2 id="feedback-heading" className="flex items-center gap-2 text-lg font-semibold">
        <Icon name="mic" className="size-5 text-brand-300" />
        Debrief
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Direct na de sessie: tik aan hoe de kart aanvoelde en laat de coureur vertellen. Inspreken mag, typen ook.
      </p>
      {tags}
      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <QuickTagToggles defaultValue={quick} />
        <FeedbackField label="Wat zegt de coureur?" defaultValue={feedback} rows={4} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={isPending} className={primaryButtonClass}>
            {isPending ? "Opslaan en labelen…" : "Debrief opslaan"}
          </button>
          <FormMessage state={state} />
        </div>
      </form>
    </section>
  );
}
