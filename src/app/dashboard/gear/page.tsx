import type { Metadata } from "next";
import Link from "next/link";

import { AddSection } from "@/components/edit-section";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { gearValidity } from "@/lib/gear";
import { getDictionary } from "@/lib/i18n/server";
import { formatCents, labelFor, todayInAmsterdam } from "@/lib/karting";

import { GearForm } from "./gear-form";
import { Validity } from "./validity";

export const metadata: Metadata = {
  title: "Uitrusting — CorsaIQ",
};

export default async function GearPage() {
  const { supabase, garage } = await getCurrentGarage();
  const t = await getDictionary();
  const today = todayInAmsterdam();

  const [gearResult, driversResult] = await Promise.all([
    supabase
      .from("gear_items")
      .select("id, category, brand, model, size, homologation, valid_until, status, purchase_price_cents, driver_id")
      .eq("garage_id", garage.id)
      .order("category")
      .order("created_at"),
    supabase.from("drivers").select("id, name").eq("garage_id", garage.id).order("created_at"),
  ]);
  if (gearResult.error) throw new Error(gearResult.error.message);

  const gear = gearResult.data;
  const drivers = driversResult.data ?? [];
  // One block per driver (in the order they were added), then shared gear without a driver.
  const groups = [
    ...drivers.map((driver) => ({ key: driver.id, title: driver.name, items: gear.filter((g) => g.driver_id === driver.id) })),
    { key: "none", title: "Geen coureur", items: gear.filter((g) => g.driver_id === null) },
  ].filter((group) => group.items.length > 0);

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Uitrusting</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Helm, overall, handschoenen en de rest, per coureur. Vul in tot wanneer de homologatie geldig is: vanaf twee maanden
          ervoor zie je een waarschuwing op je overzicht.
        </p>
      </section>

      {groups.map((group) => (
        <section key={group.key} aria-label={group.title} className={`${cardClass} overflow-x-auto p-0`}>
          <h2 className="px-6 pt-5 text-lg font-semibold">{group.title}</h2>
          <table className="mt-2 w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Item</th>
                <th scope="col" className="px-6 py-3 font-medium">Maat</th>
                <th scope="col" className="px-6 py-3 font-medium">Homologatie</th>
                <th scope="col" className="px-6 py-3 text-right font-medium">Prijs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {group.items.map((item) => (
                <tr key={item.id} className={item.status === "retired" ? "opacity-60" : undefined}>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/gear/${item.id}`} className={`${linkClass} font-medium`}>
                      {[item.brand, item.model].filter(Boolean).join(" ") || labelFor(t.options.gearCategories, item.category)}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {labelFor(t.options.gearCategories, item.category)}
                      {item.status !== "in_use" && ` · ${labelFor(t.options.gearStatuses, item.status)}`}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-zinc-300">{item.size ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className="block text-zinc-300">{item.homologation ?? "—"}</span>
                    <span className="text-xs">
                      <Validity validUntil={item.valid_until} validity={gearValidity(item.valid_until, today)} />
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums text-zinc-300">{formatCents(item.purchase_price_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <AddSection title="Uitrusting toevoegen" defaultOpen={gear.length === 0}>
        <GearForm drivers={drivers.map((d) => ({ id: d.id, label: d.name }))} />
      </AddSection>
    </>
  );
}
