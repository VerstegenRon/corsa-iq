import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { EditOnly } from "@/components/edit-access";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";

import { deleteSeason } from "../../season-actions";
import { SeasonForm } from "../season-form";

export const metadata: Metadata = {
  title: "Seizoen bewerken — CorsaIQ",
};

export default async function SeasonEditPage({ params }: PageProps<"/dashboard/seasons/[id]">) {
  const { id } = await params;
  const { supabase, garage } = await getCurrentGarage();

  const { data: season, error } = await supabase
    .from("seasons")
    .select("id, name, year, class, championship, budget_cents, events(id)")
    .eq("id", id)
    .eq("garage_id", garage.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!season) notFound();

  const events = season.events.length;

  return (
    <>
      <section>
        <Link href="/dashboard/seasons" className={`${linkClass} text-sm`}>
          ← Seizoen
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{season.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {events} {events === 1 ? "evenement" : "evenementen"} ·{" "}
          <Link href={`/dashboard/costs?season=${season.id}`} className={linkClass}>
            Kosten
          </Link>
        </p>
      </section>

      <EditOnly>
        <section aria-labelledby="edit-heading" className={cardClass}>
          <h2 id="edit-heading" className="mb-6 text-lg font-semibold">
            Bewerken
          </h2>
          <SeasonForm defaultYear={season.year} season={season} />
          <div className="mt-8 border-t border-zinc-800/80 pt-6">
            <DeleteButton
              action={deleteSeason.bind(null, season.id)}
              label="Seizoen verwijderen"
              confirmText={`${season.name} verwijderen?${events > 0 ? ` De ${events} ${events === 1 ? "evenement blijft" : "evenementen blijven"} bestaan onder “Buiten seizoen”.` : ""} Kosten van dit seizoen blijven ook bewaard.`}
            />
          </div>
        </section>
      </EditOnly>
    </>
  );
}
