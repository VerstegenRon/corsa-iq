import type { Metadata } from "next";
import Link from "next/link";

import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";
import { formatCents, formatMinutes, labelFor } from "@/lib/karting";

import { PartForm } from "./part-form";

export const metadata: Metadata = {
  title: "Onderdelen — CorsaIQ",
};

export default async function PartsPage() {
  const { supabase, garage } = await getCurrentGarage();
  const t = await getDictionary();

  const [partsResult, usageResult] = await Promise.all([
    supabase
      .from("parts")
      .select(
        "id, category, brand, model, serial_number, status, purchase_price_cents, usage_limit_minutes, part_installations(removed_at, karts(id, name))",
      )
      .eq("garage_id", garage.id)
      .order("category")
      .order("created_at"),
    supabase.from("part_usage").select("part_id, minutes_since_reset, minutes_total").eq("garage_id", garage.id),
  ]);
  if (partsResult.error) throw new Error(partsResult.error.message);

  const usageByPart = new Map((usageResult.data ?? []).map((row) => [row.part_id, row]));
  const parts = partsResult.data;

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Onderdelen</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Alles wat je bezit: motoren, banden, assen, tandwielen en meer. Draaiuren tellen mee zodra je
          sessies vastlegt.
        </p>
      </section>

      {parts.length > 0 && (
        <section aria-label="Voorraad" className={`${cardClass} overflow-x-auto p-0`}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Onderdeel</th>
                <th scope="col" className="px-6 py-3 font-medium">Nummer</th>
                <th scope="col" className="px-6 py-3 font-medium">Status</th>
                <th scope="col" className="px-6 py-3 font-medium">Sinds revisie</th>
                <th scope="col" className="px-6 py-3 text-right font-medium">Prijs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {parts.map((part) => {
                const kart = part.part_installations.find((i) => i.removed_at === null)?.karts;
                const usage = usageByPart.get(part.id);
                const minutes = usage?.minutes_since_reset ?? 0;
                const totalMinutes = usage?.minutes_total ?? 0;
                const overLimit = part.usage_limit_minutes !== null && minutes >= part.usage_limit_minutes;
                return (
                  <tr key={part.id}>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/parts/${part.id}`} className={`${linkClass} font-medium`}>
                        {[part.brand, part.model].filter(Boolean).join(" ") || labelFor(t.options.partCategories, part.category)}
                      </Link>
                      <p className="text-xs text-zinc-500">{labelFor(t.options.partCategories, part.category)}</p>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{part.serial_number ?? "—"}</td>
                    <td className="px-6 py-4">
                      {kart ? (
                        <Link href={`/dashboard/karts/${kart.id}`} className={linkClass}>
                          Op {kart.name}
                        </Link>
                      ) : (
                        <span className="text-zinc-300">{labelFor(t.options.partStatuses, part.status)}</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 tabular-nums ${overLimit ? "text-amber-300" : "text-zinc-300"}`}>
                      {formatMinutes(minutes)}
                      {part.usage_limit_minutes !== null && (
                        <span className="text-zinc-500"> / {formatMinutes(part.usage_limit_minutes)}</span>
                      )}
                      {overLimit && <span className="ml-2 text-xs">revisie nodig</span>}
                      {totalMinutes !== minutes && (
                        <span className="block text-xs text-zinc-500">totaal {formatMinutes(totalMinutes)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums text-zinc-300">
                      {formatCents(part.purchase_price_cents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section aria-labelledby="add-part-heading" className={cardClass}>
        <h2 id="add-part-heading" className="mb-6 text-lg font-semibold">
          Onderdeel toevoegen
        </h2>
        <PartForm />
      </section>
    </>
  );
}
