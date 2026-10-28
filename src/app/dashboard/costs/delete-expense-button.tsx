"use client";

import { useTransition } from "react";

import { deleteExpense } from "../expense-actions";

export function DeleteExpenseButton({ expenseId, label }: { expenseId: string; label: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      aria-label={`${label} verwijderen`}
      onClick={() => {
        if (window.confirm(`${label} verwijderen?`)) startTransition(() => deleteExpense(expenseId));
      }}
      className="rounded-full px-2 text-xs text-zinc-500 transition-colors hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-60"
    >
      {isPending ? "…" : "Verwijder"}
    </button>
  );
}
