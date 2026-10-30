"use client";

import { DeleteButton } from "@/components/delete-button";
import { format } from "@/lib/i18n/locales";
import { useT } from "@/lib/i18n/client";

import { deleteExpense } from "../expense-actions";

export function DeleteExpenseButton({ expenseId, label }: { expenseId: string; label: string }) {
  const tc = useT().costs;
  return (
    <DeleteButton
      compact
      action={() => deleteExpense(expenseId)}
      confirmText={format(tc.deleteConfirm, { name: label })}
      label={format(tc.deleteLabel, { name: label })}
    />
  );
}
