"use client";

import { useState, useTransition } from "react";

import type { FormState } from "@/components/form-message";

/**
 * Asks for confirmation, then runs a Server Action. The action redirects on success,
 * or returns an error (for example when other data still depends on the record).
 */
export function DeleteButton({
  action,
  confirmText,
  label = "Verwijderen",
  compact = false,
}: {
  action: () => Promise<FormState | void>;
  confirmText: string;
  label?: string;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={isPending}
        aria-label={compact ? label : undefined}
        onClick={() => {
          if (!window.confirm(confirmText)) return;
          setError(null);
          startTransition(async () => {
            const result = await action();
            if (result?.error) setError(result.error);
          });
        }}
        className={
          compact
            ? "rounded-full px-2 text-xs text-zinc-500 transition-colors hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-60"
            : "inline-flex h-9 items-center justify-center rounded-full border border-red-500/40 px-4 text-sm text-red-200 transition-colors hover:border-red-400 hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-60"
        }
      >
        {isPending ? "…" : compact ? "Verwijder" : label}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
