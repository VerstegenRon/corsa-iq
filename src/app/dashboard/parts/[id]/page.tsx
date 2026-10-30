import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { EditOnly } from "@/components/edit-access";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getPlanAccess } from "@/lib/plan-access";
import { format } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { ENGINE_COMPONENTS, formatCents, formatDate, labelFor, todayInAmsterdam } from "@/lib/karting";
import { computeUsage, readLimits } from "@/lib/part-usage";

import { ComponentsSection, MaintenanceSection, UsageCards } from "../../_maintenance/maintenance-sections";
import { deletePart, type MaintenanceTarget } from "../../actions";
import { PartForm } from "../part-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getDictionary()).equipment.part} — CorsaIQ` };
}

export default async function PartPage({ params }: PageProps<"/dashboard/parts/[id]">) {
  const { id } = await params;
  const { supabase, garage } = await getCurrentGarage();
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const te = t.equipment;

  const { data: part, error } = await supabase
    .from("parts")
    .select(
      "id, category, brand, model, serial_number, status, purchased_on, purchase_price_cents, usage_limit_minutes, component_limits, notes, part_installations(removed_at, karts(id, name)), session_parts(sessions(started_at, duration_s)), maintenance_records(id, performed_on, type, performed_by, description, resets_usage, components, created_at, expenses(amount_cents))",
    )
    .eq("id", id)
    .eq("garage_id", garage.id)
    .order("performed_on", { referencedTable: "maintenance_records", ascending: false })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!part) notFound();

  const name = [part.brand, part.model].filter(Boolean).join(" ") || labelFor(t.options.partCategories, part.category);
  const kart = part.part_installations.find((i) => i.removed_at === null)?.karts;
  const isEngine = part.category === "engine";
  const sessions = part.session_parts.flatMap((sp) => (sp.sessions ? [sp.sessions] : []));
  const records = part.maintenance_records;
  const usage = computeUsage(sessions, records, Object.keys(ENGINE_COMPONENTS));
  const componentLimits = readLimits(part.component_limits, Object.keys(ENGINE_COMPONENTS));
  const target: MaintenanceTarget = { kind: "part", id: part.id };

  const details = [
    [te.status, kart ? format(te.onKart, { kart: kart.name }) : labelFor(t.options.partStatuses, part.status)],
    [te.sessions, String(sessions.length)],
    [
      te.purchase,
      part.purchased_on || part.purchase_price_cents !== null
        ? `${formatDate(part.purchased_on, locale)} · ${formatCents(part.purchase_price_cents)}`
        : "—",
    ],
    [te.lastRevision, usage.lastResetOn ? formatDate(usage.lastResetOn, locale) : te.notYet],
  ];

  return (
    <>
      <section>
        <Link href="/dashboard/parts" className={`${linkClass} text-sm`}>
          {te.allParts}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {labelFor(t.options.partCategories, part.category)}
          {part.serial_number && ` · #${part.serial_number}`}
        </p>
      </section>

      <section aria-label={te.details} className={cardClass}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs tracking-wide text-zinc-500 uppercase">{label}</dt>
              <dd className="mt-1 text-sm text-zinc-100">
                {label === te.status && kart ? (
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

      <UsageCards kind="part" usage={usage} limit={part.usage_limit_minutes} t={t} />

      {isEngine && (
        <ComponentsSection
          target={target}
          canSetLimits={(await getPlanAccess()).has("limits")}
          componentSet="engine"
          usage={usage}
          limits={componentLimits}
          t={t}
          locale={locale}
        />
      )}

      <MaintenanceSection target={target} componentSet={isEngine ? "engine" : null} records={records} today={todayInAmsterdam()} t={t} locale={locale} />

      <EditOnly>
        <section aria-labelledby="edit-heading" className={cardClass}>
          <h2 id="edit-heading" className="mb-6 text-lg font-semibold">
            {te.edit}
          </h2>
          <PartForm part={part} />
          <p className="mt-4 text-xs text-zinc-500">{te.priceInCosts}</p>
          <div className="mt-8 border-t border-zinc-800/80 pt-6">
            <DeleteButton
              action={deletePart.bind(null, part.id)}
              label={te.deletePart}
              confirmText={format(te.deletePartConfirm, { part: name })}
            />
            {sessions.length > 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                {format(te.usedInSessions, { discarded: t.options.partStatuses.discarded, sold: t.options.partStatuses.sold })}
              </p>
            )}
          </div>
        </section>
      </EditOnly>
    </>
  );
}
