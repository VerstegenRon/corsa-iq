import type { Metadata } from "next";
import Link from "next/link";

import { cardClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { KART_STATUSES, labelFor } from "@/lib/karting";

import { KartForm } from "./kart-form";

export const metadata: Metadata = {
  title: "Karts — CorsaIQ",
};

export default async function KartsPage() {
  const { supabase, garage } = await getCurrentGarage();

  const { data: karts, error } = await supabase
    .from("karts")
    .select("id, name, chassis_brand, chassis_model, chassis_year, class, status, part_installations(id, removed_at)")
    .eq("garage_id", garage.id)
    .order("created_at");
  if (error) throw new Error(error.message);

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Karts</h1>
        <p className="mt-2 text-sm text-zinc-400">Je chassis, met de onderdelen die er nu op zitten.</p>
      </section>

      {karts.length > 0 && (
        <section aria-label="Je karts" className="grid gap-4 md:grid-cols-3">
          {karts.map((kart) => {
            const mounted = kart.part_installations.filter((i) => i.removed_at === null).length;
            const chassis = [kart.chassis_brand, kart.chassis_model, kart.chassis_year].filter(Boolean).join(" ");
            return (
              <Link
                key={kart.id}
                href={`/dashboard/karts/${kart.id}`}
                className={`${cardClass} transition-colors hover:border-cyan-400/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400`}
              >
                <p className="text-xs font-medium tracking-wide text-cyan-200 uppercase">
                  {labelFor(KART_STATUSES, kart.status)}
                  {kart.class && ` · ${kart.class}`}
                </p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight">{kart.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">{chassis || "Chassis nog niet ingevuld"}</p>
                <p className="mt-4 text-sm text-zinc-300">
                  {mounted} {mounted === 1 ? "onderdeel" : "onderdelen"} gemonteerd
                </p>
              </Link>
            );
          })}
        </section>
      )}

      <section aria-labelledby="add-kart-heading" className={cardClass}>
        <h2 id="add-kart-heading" className="mb-6 text-lg font-semibold">
          Kart toevoegen
        </h2>
        <KartForm />
      </section>
    </>
  );
}
