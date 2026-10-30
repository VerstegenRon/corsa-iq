"use client";

// Driver feedback straight on the session page, so it can be spoken in right after the session
// without opening the full edit form.

import { useActionState, type ReactNode } from "react";

import { useCanEdit } from "@/components/edit-access";
import { FeedbackField } from "@/components/feedback-field";
import { FormMessage, type FormState } from "@/components/form-message";
import { Icon } from "@/components/icons";
import { QuickTagToggles } from "@/components/quick-tags";
import { cardClass, primaryButtonClass } from "@/components/ui";
import type { QuickTag } from "@/lib/feedback";
import { useT } from "@/lib/i18n/client";

import { saveFeedback } from "../../season-actions";

const initialState: FormState = {};

export function FeedbackCard({
  sessionId,
  feedback,
  quick,
  tags,
}: {
  sessionId: string;
  feedback: string | null;
  quick: QuickTag[];
  tags: ReactNode;
}) {
  const tf = useT().feedback;
  const [state, formAction, isPending] = useActionState(saveFeedback.bind(null, sessionId), initialState);

  // Viewers read the debrief; they cannot change it.
  if (!useCanEdit()) {
    if (!feedback && quick.length === 0) return null;
    return (
      <section aria-labelledby="feedback-heading" className={cardClass}>
        <h2 id="feedback-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Icon name="mic" className="size-5 text-brand-300" />
          {tf.debrief}
        </h2>
        {tags}
        {feedback && <p className="mt-4 text-sm whitespace-pre-line text-zinc-200">{feedback}</p>}
      </section>
    );
  }

  return (
    <section aria-labelledby="feedback-heading" className={cardClass}>
      <h2 id="feedback-heading" className="flex items-center gap-2 text-lg font-semibold">
        <Icon name="mic" className="size-5 text-brand-300" />
        {tf.debrief}
      </h2>
      <p className="mt-1 text-sm text-zinc-400">{tf.intro}</p>
      {tags}
      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <QuickTagToggles defaultValue={quick} />
        <FeedbackField label={tf.driverSays} defaultValue={feedback} rows={4} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={isPending} className={primaryButtonClass}>
            {isPending ? tf.saving : tf.save}
          </button>
          <FormMessage state={state} />
        </div>
      </form>
    </section>
  );
}
