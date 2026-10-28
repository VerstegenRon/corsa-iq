import type { Metadata } from "next";
import Link from "next/link";

import { AddSection } from "@/components/edit-section";
import { cardClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";
import { formatCents, labelFor, todayInAmsterdam } from "@/lib/karting";

import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";

export const metadata: Metadata = {
  title: "Kosten — CorsaIQ",
};

function sumBy<T>(rows: T[], key: (row: T) => string, amount: (row: T) => number) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + amount(row));
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function CostsPage({ searchParams }: PageProps<"/dashboard/costs">) {
  const { season: seasonParam } = await searchParams;
  const { supabase, garage } = await getCurrentGarage();
  const t = await getDictionary();

  const [seasonsResult, eventsResult] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, budget_cents")
      .eq("garage_id", garage.id)
      .order("year", { ascending: false }),
    supabase
      .from("events")
      .select("id, name, starts_on")
      .eq("garage_id", garage.id)
      .order("starts_on", { ascending: false }),
  ]);
  if (seasonsResult.error) throw new Error(seasonsResult.error.message);
  const seasons = seasonsResult.data;

  // Default to the newest season; "all" shows everything, "none" only costs outside a season.
  const filter = typeof seasonParam === "string" ? seasonParam : (seasons[0]?.id ?? "all");
  const season = seasons.find((s) => s.id === filter) ?? null;

  let query = supabase
    .from("expenses")
    .select("id, category, spent_on, amount_cents, description, receipt_path, events(id, name)")
    .eq("garage_id", garage.id)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (season) query = query.eq("season_id", season.id);
  else if (filter === "none") query = query.is("season_id", null);
  const expensesResult = await query;
  if (expensesResult.error) throw new Error(expensesResult.error.message);
  const expenses = expensesResult.data;

  const total = expenses.reduce((sum, e) => sum + e.amount_cents, 0);
  const byCategory = sumBy(expenses, (e) => e.category, (e) => e.amount_cents);
  const byEvent = sumBy(
    expenses.filter((e) => e.events),
    (e) => e.events!.id,
    (e) => e.amount_cents,
  ).map(([id, cents]) => ({ id, cents, name: expenses.find((e) => e.events?.id === id)!.events!.name }));
  const budget = season?.budget_cents ?? null;
  const usedShare = budget ? Math.min(total / budget, 1) : 0;

  const filters = [
    ...seasons.map((s) => ({ value: s.id, label: s.name })),
    { value: "none", label: "Buiten seizoen" },
    { value: "all", label: "Alles" },
  ];

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Kosten</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Wat je seizoen kost, per categorie en per evenement. Onderdelen met een aankoopprijs tellen automatisch mee.
        </p>
        <nav aria-label="Seizoen kiezen" className="mt-6 flex flex-wrap gap-2">
          {filters.map((f) => (
            <Link
              key={f.value}
              href={`/dashboard/costs?season=${f.value}`}
              aria-current={filter === f.value ? "page" : undefined}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
                filter === f.value
                  ? "border-brand-400/50 bg-brand-400/10 text-brand-100"
                  : "border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </section>

      <section aria-label="Samenvatting" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">Uitgegeven</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{formatCents(total)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">{budget !== null && total > budget ? "Over budget" : "Budget over"}</p>
          <p
            className={`mt-2 text-2xl font-semibold tabular-nums sm:text-3xl ${budget !== null && total > budget ? "text-red-300" : ""}`}
          >
            {budget === null ? "—" : formatCents(Math.abs(budget - total))}
          </p>
          {budget !== null && (
            <div
              role="meter"
              aria-label="Deel van het budget gebruikt"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(usedShare * 100)}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"
            >
              <div
                className={`h-full rounded-full ${total > budget ? "bg-red-400" : "bg-zinc-300"}`}
                style={{ width: `${usedShare * 100}%` }}
              />
            </div>
          )}
          {season && budget === null && <p className="mt-2 text-xs text-zinc-500">Geen budget ingesteld voor dit seizoen.</p>}
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">Uitgaven</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{expenses.length}</p>
        </div>
      </section>

      {expenses.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="category-heading" className={cardClass}>
            <h2 id="category-heading" className="text-lg font-semibold">
              Per categorie
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {byCategory.map(([category, cents]) => (
                <li key={category}>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-300">{labelFor(t.options.expenseCategories, category)}</span>
                    <span className="tabular-nums">{formatCents(cents)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-zinc-400" style={{ width: `${(cents / total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="event-heading" className={cardClass}>
            <h2 id="event-heading" className="text-lg font-semibold">
              Per evenement
            </h2>
            {byEvent.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Nog geen uitgaven gekoppeld aan een evenement.</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-800/80">
                {byEvent.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="flex justify-between gap-4 py-2.5 text-sm hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
                    >
                      <span className="text-zinc-300">{event.name}</span>
                      <span className="tabular-nums">{formatCents(event.cents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <section aria-labelledby="expenses-heading" className={cardClass}>
        <h2 id="expenses-heading" className="text-lg font-semibold">
          Uitgaven
        </h2>
        <ExpenseList expenses={expenses} />
      </section>

      <AddSection title="Uitgave toevoegen" defaultOpen={expenses.length === 0}>
        <ExpenseForm
          key={filter}
          garageId={garage.id}
          defaultDate={todayInAmsterdam()}
          defaultSeasonId={season?.id ?? seasons[0]?.id}
          seasons={seasons.map((s) => ({ id: s.id, label: s.name }))}
          events={(eventsResult.data ?? []).map((e) => ({ id: e.id, label: e.name }))}
        />
      </AddSection>
    </>
  );
}
