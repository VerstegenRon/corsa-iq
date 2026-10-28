import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { gearValidity } from "@/lib/gear";
import { getDictionary } from "@/lib/i18n/server";
import { formatCents, formatDate, labelFor, todayInAmsterdam } from "@/lib/karting";

import { deleteGear } from "../../gear-actions";
import { GearForm } from "../gear-form";
import { Validity } from "../validity";

export const metadata: Metadata = {
  title: "Uitrusting — CorsaIQ",
};

export default async function GearItemPage({ params }: PageProps<"/dashboard/gear/[id]">) {
  const { id } = await params;
  const { supabase, garage } = await getCurrentGarage();
  const t = await getDictionary();

  const [gearResult, driversResult] = await Promise.all([
    supabase
      .from("gear_items")
      .select("id, category, driver_id, brand, model, size, homologation, valid_until, status, purchased_on, purchase_price_cents, notes, drivers(name)")
      .eq("id", id)
      .eq("garage_id", garage.id)
      .maybeSingle(),
    supabase.from("drivers").select("id, name").eq("garage_id", garage.id).order("created_at"),
  ]);
  if (gearResult.error) throw new Error(gearResult.error.message);
  const gear = gearResult.data;
  if (!gear) notFound();

  const category = labelFor(t.options.gearCategories, gear.category);
  const name = [gear.brand, gear.model].filter(Boolean).join(" ") || category;
  const details: [string, React.ReactNode][] = [
    ["Coureur", gear.drivers?.name ?? "Geen / gedeeld"],
    ["Status", labelFor(t.options.gearStatuses, gear.status)],
    ["Maat", gear.size ?? "—"],
    ["Homologatie", gear.homologation ?? "—"],
    ["Geldig", <Validity key="validity" validUntil={gear.valid_until} validity={gearValidity(gear.valid_until, todayInAmsterdam())} />],
    [
      "Aankoop",
      gear.purchased_on || gear.purchase_price_cents !== null
        ? `${formatDate(gear.purchased_on)} · ${formatCents(gear.purchase_price_cents)}`
        : "—",
    ],
  ];

  return (
    <>
      <section>
        <Link href="/dashboard/gear" className={`${linkClass} text-sm`}>
          ← Uitrusting
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-2 text-sm text-zinc-400">{category}</p>
        {gear.notes && <p className="mt-3 text-sm text-zinc-300">{gear.notes}</p>}
      </section>

      <section aria-label="Gegevens" className={cardClass}>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-zinc-800/60 pb-2">
              <dt className="text-zinc-400">{label}</dt>
              <dd className="text-right text-zinc-100">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="edit-heading" className={cardClass}>
        <h2 id="edit-heading" className="mb-6 text-lg font-semibold">
          Bewerken
        </h2>
        <GearForm drivers={(driversResult.data ?? []).map((d) => ({ id: d.id, label: d.name }))} gear={gear} />
        <p className="mt-3 text-xs text-zinc-500">De aankoopprijs staat ook bij je kosten; die past mee als je de prijs of datum wijzigt.</p>
        <div className="mt-8 border-t border-zinc-800/80 pt-6">
          <DeleteButton
            action={deleteGear.bind(null, gear.id)}
            label="Verwijderen"
            confirmText={`${name} verwijderen?${gear.purchase_price_cents ? " De aankoop verdwijnt ook uit je kosten." : ""}`}
          />
        </div>
      </section>
    </>
  );
}
