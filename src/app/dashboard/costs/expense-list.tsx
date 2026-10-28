import Link from "next/link";

import { getCurrentGarage } from "@/lib/garage";
import { EXPENSE_CATEGORIES, formatCents, formatDate, labelFor } from "@/lib/karting";
import { RECEIPT_BUCKET } from "@/lib/storage";

import { DeleteExpenseButton } from "./delete-expense-button";

export type ExpenseRow = {
  id: string;
  category: string;
  spent_on: string;
  amount_cents: number;
  description: string | null;
  receipt_path: string | null;
  events: { id: string; name: string } | null;
};

/** Receipts are private; links are signed for an hour, long enough for one visit. */
async function signReceipts(expenses: ExpenseRow[]): Promise<Map<string, string>> {
  const paths = expenses.map((e) => e.receipt_path).filter((path): path is string => path !== null);
  if (paths.length === 0) return new Map();
  const { supabase } = await getCurrentGarage();
  const { data } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrls(paths, 60 * 60);
  return new Map((data ?? []).flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [])));
}

export async function ExpenseList({ expenses, showEvent = true }: { expenses: ExpenseRow[]; showEvent?: boolean }) {
  if (expenses.length === 0) return <p className="mt-3 text-sm text-zinc-500">Nog geen uitgaven.</p>;
  const receiptUrls = await signReceipts(expenses);

  return (
    <ul className="mt-4 divide-y divide-zinc-800/80">
      {expenses.map((expense) => {
        const category = labelFor(EXPENSE_CATEGORIES, expense.category);
        const receiptUrl = expense.receipt_path ? receiptUrls.get(expense.receipt_path) : undefined;
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
                {receiptUrl && (
                  <>
                    {" · "}
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                    >
                      Bonnetje
                    </a>
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
