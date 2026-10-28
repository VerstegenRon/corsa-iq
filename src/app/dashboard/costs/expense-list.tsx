import Link from "next/link";

import { EXPENSE_CATEGORIES, formatCents, formatDate, labelFor } from "@/lib/karting";

import { DeleteExpenseButton } from "./delete-expense-button";

export type ExpenseRow = {
  id: string;
  category: string;
  spent_on: string;
  amount_cents: number;
  description: string | null;
  events: { id: string; name: string } | null;
};

export function ExpenseList({ expenses, showEvent = true }: { expenses: ExpenseRow[]; showEvent?: boolean }) {
  if (expenses.length === 0) return <p className="mt-3 text-sm text-zinc-500">Nog geen uitgaven.</p>;
  return (
    <ul className="mt-4 divide-y divide-zinc-800/80">
      {expenses.map((expense) => {
        const category = labelFor(EXPENSE_CATEGORIES, expense.category);
        return (
          <li key={expense.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-100">{expense.description ?? category}</p>
              <p className="text-xs text-zinc-500">
                {formatDate(expense.spent_on)} · {category}
                {showEvent && expense.events && (
                  <>
                    {" · "}
                    <Link href={`/dashboard/events/${expense.events.id}`} className="hover:text-zinc-300">
                      {expense.events.name}
                    </Link>
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-semibold tabular-nums">{formatCents(expense.amount_cents)}</span>
              <DeleteExpenseButton expenseId={expense.id} label={expense.description ?? category} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
