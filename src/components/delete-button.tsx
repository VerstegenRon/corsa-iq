"use client";

import { useState, useTransition } from "react";

import type { FormState } from "@/components/form-message";
import { Icon } from "@/components/icons";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

/**
 * Asks for confirmation in place, then runs a Server Action. The action redirects on success,
 * or returns an error (for example when other data still depends on the record).
 *
 * The question is shown in the page itself rather than with window.confirm: some browsers and
 * in-app browsers never show that dialog and answer "no", which made deleting silently do nothing.
 */
export function DeleteButton({
  action,
  confirmText,
  label = "Verwijderen",
  compact = false,
  iconOnly = false,
}: {
  action: () => Promise<FormState | void>;
  confirmText: string;
  label?: string;
  compact?: boolean;
  /** A small round × instead of the word, for long lists; `label` names it for screen readers. */
  iconOnly?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
      setConfirming(false);
    });
  }

  const errorMessage = error && (
    <p role="alert" className="text-sm text-red-300">
      {error}
    </p>
  );

  if (confirming) {
    return (
      <div
        role="group"
        aria-label={label}
        className={`flex flex-col gap-2 ${compact ? "items-end" : "items-start"}`}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isPending) setConfirming(false);
        }}
      >
        <p aria-live="polite" className={`text-zinc-300 ${compact ? "max-w-[16rem] text-right text-xs" : "text-sm"}`}>
          {confirmText}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            autoFocus
            disabled={isPending}
            onClick={run}
            className={`inline-flex items-center justify-center rounded-full bg-red-600 font-medium text-on-brand transition-colors hover:bg-red-700 disabled:opacity-60 ${focusRing} ${
              compact ? "h-7 px-3 text-xs" : "h-9 px-4 text-sm"
            }`}
          >
            {isPending ? "Bezig…" : "Ja, verwijderen"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirming(false)}
            className={`inline-flex items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:text-white disabled:opacity-60 ${focusRing} ${
              compact ? "h-7 px-3 text-xs" : "h-9 px-4 text-sm"
            }`}
          >
            Annuleren
          </button>
        </div>
        {errorMessage}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${compact ? "items-end" : "items-start"}`}>
      <button
        type="button"
        aria-label={compact || iconOnly ? label : undefined}
        onClick={() => setConfirming(true)}
        className={
          iconOnly
            ? `inline-flex size-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300 ${focusRing}`
            : compact
            ? `rounded-full px-2 text-xs text-zinc-500 transition-colors hover:text-red-300 ${focusRing}`
            : `inline-flex h-9 items-center justify-center rounded-full border border-red-500/40 px-4 text-sm text-red-200 transition-colors hover:border-red-400 hover:bg-red-500/10 ${focusRing}`
        }
      >
        {iconOnly ? <Icon name="plus" className="size-4 rotate-45" /> : compact ? "Verwijder" : label}
      </button>
      {errorMessage}
    </div>
  );
}
