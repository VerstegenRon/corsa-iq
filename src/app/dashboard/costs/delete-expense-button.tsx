"use client";

import { DeleteButton } from "@/components/delete-button";

import { deleteExpense } from "../expense-actions";

export function DeleteExpenseButton({ expenseId, label }: { expenseId: string; label: string }) {
  return <DeleteButton compact action={() => deleteExpense(expenseId)} confirmText={`${label} verwijderen?`} label={`${label} verwijderen`} />;
}
