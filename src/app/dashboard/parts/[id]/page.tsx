import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { PART_CATEGORIES, PART_STATUSES, formatCents, formatDate, formatMinutes, labelFor } from "@/lib/karting";

import { deletePart } from "../../actions";
import { PartForm } from "../part-form";

export const metadata: Metadata = {
  title: "Onderdeel — CorsaIQ",
};

export default async function PartPage({ params }: PageProps<"/dashboard/parts/[id]">) {
  const { id } = await params;
  const { supabase, garage } = await getCurrentGarage();

  const [partResult, usageResult] = await Promise.all([
    supabase
      .from("parts")
      .select(
        "id, category, brand, model, serial_number, status, purchased_on, purchase_price_cents, usage_limit_minutes, notes, part_installations(removed_at, karts(id, name)), session_parts(session_id)",
      )
      .eq("id", id)
      .eq("garage_id", garage.id)
      .maybeSingle(),
    supabase.from("part_usage").select("minutes_since_reset").eq("part_id", id).maybeSingle(),
  ]);
  if (partResult.error) throw new Error(partResult.error.message);
  const part = partResult.data;
  if (!part) notFound();

  const name = [part.brand, part.model].filter(Boolean).join(" ") || labelFor(PART_CATEGORIES, part.category);
  const kart = part.part_installations.find((i) => i.removed_at === null)?.karts;
  const minutes = usageResult.data?.minutes_since_reset ?? 0;
  const sessions = part.session_parts.length;

  const details = [
    ["Status", kart ? `Op ${kart.name}` : labelFor(PART_STATUSES, part.status)],
    ["Draaitijd", `${formatMinutes(minutes)}${part.usage_limit_minutes !== null ? ` / ${formatMinutes(part.usage_limit_minutes)}` : ""}`],
    ["Sessies", String(sessions)],
    ["Aankoop", part.purchased_on || part.purchase_price_cents !== null ? `${formatDate(part.purchased_on)} · ${formatCents(part.purchase_price_cents)}` : "—"],
  ];

  return (
    <>
      <section>
        <Link href="/dashboard/parts" className={`${linkClass} text-sm`}>
          ← Alle onderdelen
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {labelFor(PART_CATEGORIES, part.category)}
          {part.serial_number && ` · #${part.serial_number}`}
        </p>
      </section>

      <section aria-label="Gegevens" className={cardClass}>
        <dl className="grid gap-4 sm:grid-cols-4">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs tracking-wide text-zinc-500 uppercase">{label}</dt>
              <dd className="mt-1 text-sm text-zinc-100">
                {label === "Status" && kart ? (
                  <Link href={`/dashboard/karts/${kart.id}`} className={linkClass}>
                    {value}
                  </Link>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="edit-heading" className={cardClass}>
        <h2 id="edit-heading" className="mb-6 text-lg font-semibold">
          Bewerken
        </h2>
        <PartForm part={part} />
        <p className="mt-4 text-xs text-zinc-500">
          De aankoopprijs staat ook bij je kosten; die past mee als je de prijs of datum wijzigt.
        </p>
        <div className="mt-8 border-t border-zinc-800/80 pt-6">
          <DeleteButton
            action={deletePart.bind(null, part.id)}
            label="Onderdeel verwijderen"
            confirmText={`${name} verwijderen? De aankoop verdwijnt ook uit je kosten.`}
          />
          {sessions > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              Gebruikt in sessies: verwijderen kan niet, zet de status op “Afgeschreven” of “Verkocht”.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
