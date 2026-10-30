import type { Metadata } from "next";
import Link from "next/link";

import { AddSection } from "@/components/edit-section";
import { Icon, IconTile } from "@/components/icons";
import { Chip, Meter, toneForShare } from "@/components/meter";
import { EmptyState, PageHeader } from "@/components/page-header";
import { atLimit, LimitReached } from "@/components/plan-lock";
import { cardClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";
import { CHASSIS_COMPONENTS, formatMinutes, labelFor } from "@/lib/karting";
import { computeUsage } from "@/lib/part-usage";

import { KartForm } from "./kart-form";

export const metadata: Metadata = {
  title: "Karts — CorsaIQ",
};

export default async function KartsPage() {
  const { supabase, garage } = await getCurrentGarage();
  const t = await getDictionary();

  const { data: karts, error } = await supabase
    .from("karts")
    .select(
      "id, name, chassis_brand, chassis_model, chassis_year, class, status, usage_limit_minutes, part_installations(id, removed_at), sessions(started_at, duration_s), maintenance_records(performed_on, resets_usage, components)",
    )
    .eq("garage_id", garage.id)
    .order("created_at");
  if (error) throw new Error(error.message);
  // Sold and retired karts do not count towards the plan.
  const inUse = karts.filter((k) => k.status === "active" || k.status === "spare").length;

  return (
    <>
      <PageHeader
        icon="kart"
        title="Karts"
        subtitle={karts.length > 0 ? `${karts.length} ${karts.length === 1 ? "kart" : "karts"}` : undefined}
        add="Kart"
      />

      {karts.length === 0 ? (
        <EmptyState icon="kart" title="Nog geen kart" text="Voeg je chassis toe; daarna monteer je er motor, banden en onderdelen op." />
      ) : (
        <section aria-label="Je karts" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {karts.map((kart) => {
            const mounted = kart.part_installations.filter((i) => i.removed_at === null).length;
            const chassis = [kart.chassis_brand, kart.chassis_model, kart.chassis_year].filter(Boolean).join(" ");
            const usage = computeUsage(kart.sessions, kart.maintenance_records, Object.keys(CHASSIS_COMPONENTS));
            const limit = kart.usage_limit_minutes;
            const share = limit ? usage.sinceResetMinutes / limit : null;
            return (
              <Link
                key={kart.id}
                href={`/dashboard/karts/${kart.id}`}
                className={`${cardClass} group flex flex-col gap-4 transition-colors hover:border-brand-400/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400`}
              >
                <div className="flex items-start gap-3">
                  <IconTile name="kart" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold tracking-tight">{kart.name}</h2>
                    <p className="truncate text-sm text-zinc-400">{chassis || kart.class || "Chassis nog niet ingevuld"}</p>
                  </div>
                  <Icon name="chevron" className="size-4 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-300" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone={kart.status === "active" ? "brand" : "neutral"}>{labelFor(t.options.kartStatuses, kart.status)}</Chip>
                  {kart.class && chassis && <Chip>{kart.class}</Chip>}
                  <Chip>
                    <Icon name="part" className="size-3" />
                    {mounted} gemonteerd
                  </Chip>
                </div>
                <div className="mt-auto">
                  <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
                    <span>Sinds groot onderhoud</span>
                    <span className="tabular-nums">
                      {formatMinutes(usage.sinceResetMinutes)}
                      {limit && <span className="text-zinc-500"> / {formatMinutes(limit)}</span>}
                    </span>
                  </div>
                  {share !== null ? (
                    <Meter share={share} tone={toneForShare(share)} label={`${kart.name}: deel van de onderhoudsgrens gebruikt`} />
                  ) : (
                    <div aria-hidden="true" className="h-1.5 rounded-full bg-zinc-800" />
                  )}
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <AddSection title="Kart toevoegen" defaultOpen={karts.length === 0}>
        {(await atLimit("karts", inUse)) ? <LimitReached counted="karts" used={inUse} /> : <KartForm />}
      </AddSection>
    </>
  );
}
