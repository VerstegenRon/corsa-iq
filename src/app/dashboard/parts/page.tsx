import type { Metadata } from "next";
import Link from "next/link";

import { AddSection } from "@/components/edit-section";
import { Icon, IconTile, PART_ICONS, iconFor, type IconName } from "@/components/icons";
import { Chip, Meter, toneForShare } from "@/components/meter";
import { EmptyState, PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";
import { formatCents, formatMinutes, labelFor, sortedEntries } from "@/lib/karting";

import { PartForm } from "./part-form";

export const metadata: Metadata = {
  title: "Onderdelen — CorsaIQ",
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export default async function PartsPage({ searchParams }: PageProps<"/dashboard/parts">) {
  const { category } = await searchParams;
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
  const active = typeof category === "string" && parts.some((p) => p.category === category) ? category : null;
  const shown = active ? parts.filter((p) => p.category === active) : parts;
  const counts = new Map<string, number>();
  for (const part of parts) counts.set(part.category, (counts.get(part.category) ?? 0) + 1);
  const categories = sortedEntries(t.options.partCategories).filter(([key]) => counts.has(key));

  return (
    <>
      <PageHeader
        icon="engine"
        title="Onderdelen"
        subtitle={parts.length > 0 ? `${parts.length} ${parts.length === 1 ? "onderdeel" : "onderdelen"}` : undefined}
        add="Onderdeel"
      />

      {parts.length === 0 ? (
        <EmptyState icon="engine" title="Nog geen onderdelen" text="Motoren, banden, assen en meer. Draaiuren tellen mee zodra je sessies vastlegt." />
      ) : (
        <>
          {categories.length > 1 && (
            <nav aria-label="Filter op categorie" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              <FilterChip href="/dashboard/parts" active={!active} label="Alles" count={parts.length} />
              {categories.map(([key, label]) => (
                <FilterChip
                  key={key}
                  href={`/dashboard/parts?category=${key}`}
                  active={active === key}
                  label={label}
                  count={counts.get(key)!}
                  icon={iconFor(PART_ICONS, key)}
                />
              ))}
            </nav>
          )}

          <section aria-label="Voorraad" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((part) => {
              const kart = part.part_installations.find((i) => i.removed_at === null)?.karts;
              const usage = usageByPart.get(part.id);
              const minutes = usage?.minutes_since_reset ?? 0;
              const limit = part.usage_limit_minutes;
              const share = limit ? minutes / limit : null;
              const name = [part.brand, part.model].filter(Boolean).join(" ") || labelFor(t.options.partCategories, part.category);
              return (
                <Link
                  key={part.id}
                  href={`/dashboard/parts/${part.id}`}
                  className={`${cardClass} group flex flex-col gap-4 transition-colors hover:border-brand-400/40 ${focusRing}`}
                >
                  <div className="flex items-start gap-3">
                    <IconTile name={iconFor(PART_ICONS, part.category)} tone={kart ? "brand" : "neutral"} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold tracking-tight">{name}</h2>
                      <p className="truncate text-xs text-zinc-500">
                        {labelFor(t.options.partCategories, part.category)}
                        {part.serial_number && ` · ${part.serial_number}`}
                      </p>
                    </div>
                    {part.purchase_price_cents !== null && (
                      <span className="shrink-0 text-xs text-zinc-400 tabular-nums">{formatCents(part.purchase_price_cents)}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {kart ? (
                      <Chip tone="brand">
                        <Icon name="kart" className="size-3" />
                        Op {kart.name}
                      </Chip>
                    ) : (
                      <Chip>{labelFor(t.options.partStatuses, part.status)}</Chip>
                    )}
                  </div>
                  <div className="mt-auto">
                    <div className="mb-1.5 flex justify-between text-xs text-zinc-400">
                      <span>Draaitijd</span>
                      <span className="tabular-nums">
                        {formatMinutes(minutes)}
                        {limit && <span className="text-zinc-500"> / {formatMinutes(limit)}</span>}
                      </span>
                    </div>
                    {share !== null ? (
                      <Meter share={share} tone={toneForShare(share)} label={`${name}: deel van de grens gebruikt`} />
                    ) : (
                      <div aria-hidden="true" className="h-1.5 rounded-full bg-zinc-800" />
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        </>
      )}

      <AddSection title="Onderdeel toevoegen" defaultOpen={parts.length === 0}>
        <PartForm />
      </AddSection>
    </>
  );
}

function FilterChip({ href, active, label, count, icon }: { href: string; active: boolean; label: string; count: number; icon?: IconName }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors ${focusRing} ${
        active ? "border-zinc-600 bg-zinc-800 text-white" : "border-zinc-800 text-zinc-400 hover:text-white"
      }`}
    >
      {icon && <Icon name={icon} className="size-4" />}
      {label}
      <span className="text-xs text-zinc-500 tabular-nums">{count}</span>
    </Link>
  );
}
