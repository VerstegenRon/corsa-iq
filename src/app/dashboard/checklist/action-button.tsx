"use client";

import { useState, useTransition } from "react";

import { useCanEdit } from "@/components/edit-access";
import type { FormState } from "@/components/form-message";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";

/** A button that runs one Server Action, such as "use the standard list", and shows its error. */
export function ActionButton({
  action,
  label,
  pendingLabel = "Bezig…",
  variant = "primary",
}: {
  action: () => Promise<FormState>;
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!useCanEdit()) return null;
  return (
    <div className="flex flex-col gap-2">
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await action();
              setError(result.error ?? null);
            })
          }
          className={variant === "primary" ? primaryButtonClass : secondaryButtonClass}
        >
          {pending ? pendingLabel : label}
        </button>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
