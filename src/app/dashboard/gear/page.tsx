import type { Metadata } from "next";
import Link from "next/link";

import { AddSection } from "@/components/edit-section";
import { GEAR_ICONS, Icon, IconTile, iconFor } from "@/components/icons";
import { Chip } from "@/components/meter";
import { EmptyState, PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { gearValidity } from "@/lib/gear";
import { format, plural } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { formatCents, formatDate, labelFor, todayInAmsterdam } from "@/lib/karting";

import { GearForm } from "./gear-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getDictionary()).gear.title} — CorsaIQ` };
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export default async function GearPage() {
  const { supabase, garage } = await getCurrentGarage();
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const tg = t.gear;
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
    { key: "none", title: tg.shared, items: gear.filter((g) => g.driver_id === null) },
  ].filter((group) => group.items.length > 0);

  return (
    <>
      <PageHeader
        icon="helmet"
        title={tg.title}
        subtitle={gear.length > 0 ? tg.hint : undefined}
        add={tg.add}
      />

      {gear.length === 0 && (
        <EmptyState icon="helmet" title={tg.emptyTitle} text={tg.emptyText} />
      )}

      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`gear-${group.key}`} className="flex flex-col gap-3">
          <h2 id={`gear-${group.key}`} className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <Icon name="user" className="size-4" />
            {group.title}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => {
              const validity = gearValidity(item.valid_until, today);
              const name = [item.brand, item.model].filter(Boolean).join(" ") || labelFor(t.options.gearCategories, item.category);
              const tone = validity?.tone === "expired" ? "red" : validity?.tone === "soon" ? "amber" : "brand";
              return (
                <Link
                  key={item.id}
                  href={`/dashboard/gear/${item.id}`}
                  className={`${cardClass} group flex flex-col gap-4 transition-colors hover:border-brand-400/40 ${focusRing} ${
                    item.status === "retired" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <IconTile name={iconFor(GEAR_ICONS, item.category)} tone={tone} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold tracking-tight">{name}</h3>
                      <p className="truncate text-xs text-zinc-500">
                        {labelFor(t.options.gearCategories, item.category)}
                        {item.size && ` · ${format(tg.sizeShort, { size: item.size })}`}
                      </p>
                    </div>
                    {item.purchase_price_cents !== null && (
                      <span className="shrink-0 text-xs text-zinc-400 tabular-nums">{formatCents(item.purchase_price_cents)}</span>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {item.homologation && <Chip>{item.homologation}</Chip>}
                    {validity && (
                      <Chip tone={validity.tone === "expired" ? "due" : validity.tone === "soon" ? "soon" : "neutral"}>
                        {validity.tone === "expired"
                          ? tg.expired
                          : validity.tone === "soon"
                            ? plural(validity.daysLeft, tg.daysLeft)
                            : format(tg.until, { date: formatDate(item.valid_until, locale) })}
                      </Chip>
                    )}
                    {item.status !== "in_use" && <Chip>{labelFor(t.options.gearStatuses, item.status)}</Chip>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <AddSection title={tg.addGear} defaultOpen={gear.length === 0}>
        <GearForm drivers={drivers.map((d) => ({ id: d.id, label: d.name }))} />
      </AddSection>
    </>
  );
}
