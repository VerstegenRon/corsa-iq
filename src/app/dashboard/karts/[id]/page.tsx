import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { EditOnly } from "@/components/edit-access";
import { EditSection } from "@/components/edit-section";
import { cardClass, linkClass, secondaryButtonClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { getDictionary } from "@/lib/i18n/server";
import { CHASSIS_COMPONENTS, formatDate, labelFor, todayInAmsterdam } from "@/lib/karting";
import { computeUsage, readLimits } from "@/lib/part-usage";

import { ComponentsSection, MaintenanceSection, UsageCards } from "../../_maintenance/maintenance-sections";
import { deleteKart, removePart, type MaintenanceTarget } from "../../actions";
import { KartForm } from "../kart-form";
import { InstallForm } from "./install-form";

export const metadata: Metadata = {
  title: "Kart — CorsaIQ",
};

function partLabel(part: { category: string; brand: string | null; model: string | null; serial_number: string | null }, t: Dictionary) {
  const name = [part.brand, part.model].filter(Boolean).join(" ") || labelFor(t.options.partCategories, part.category);
  return part.serial_number ? `${name} (#${part.serial_number})` : name;
}

export default async function KartPage({ params }: PageProps<"/dashboard/karts/[id]">) {
  const { id } = await params;
  const { supabase, garage } = await getCurrentGarage();
  const t = await getDictionary();

  const [kartResult, stockResult] = await Promise.all([
    supabase
      .from("karts")
      .select(
        "id, name, chassis_brand, chassis_model, chassis_year, homologation, serial_number, class, status, usage_limit_minutes, component_limits, sessions(started_at, duration_s), maintenance_records(id, performed_on, type, performed_by, description, resets_usage, components, created_at, expenses(amount_cents)), part_installations(id, installed_at, removed_at, parts(id, category, brand, model, serial_number))",
      )
      .eq("id", id)
      .eq("garage_id", garage.id)
      .order("installed_at", { referencedTable: "part_installations", ascending: false })
      .order("performed_on", { referencedTable: "maintenance_records", ascending: false })
      .maybeSingle(),
    supabase.from("parts").select("id, category, brand, model, serial_number").eq("garage_id", garage.id).eq("status", "in_stock").order("category"),
  ]);
  if (kartResult.error) throw new Error(kartResult.error.message);
  const kart = kartResult.data;
  if (!kart) notFound();

  const mounted = kart.part_installations.filter((i) => i.removed_at === null && i.parts);
  const history = kart.part_installations.filter((i) => i.removed_at !== null && i.parts);
  const stockOptions = (stockResult.data ?? []).map((part) => ({
    id: part.id,
    label: `${labelFor(t.options.partCategories, part.category)}: ${partLabel(part, t)}`,
  }));

  const chassisKeys = Object.keys(CHASSIS_COMPONENTS);
  const usage = computeUsage(kart.sessions, kart.maintenance_records, chassisKeys);
  const componentLimits = readLimits(kart.component_limits, chassisKeys);
  const target: MaintenanceTarget = { kind: "kart", id: kart.id };

  const details = [
    ["Chassis", [kart.chassis_brand, kart.chassis_model].filter(Boolean).join(" ")],
    ["Bouwjaar", kart.chassis_year?.toString()],
    ["Klasse", kart.class],
    ["Chassisnummer", kart.serial_number],
    ["Homologatie", kart.homologation],
    ["Sessies", String(kart.sessions.length)],
    ["Laatste groot onderhoud", usage.lastResetOn ? formatDate(usage.lastResetOn) : "nog niet"],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <>
      <section>
        <Link href="/dashboard/karts" className={`${linkClass} text-sm`}>
          ← Alle karts
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{kart.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">{labelFor(t.options.kartStatuses, kart.status)}</p>
      </section>

      {details.length > 0 && (
        <section aria-label="Gegevens" className={cardClass}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs tracking-wide text-zinc-500 uppercase">{label}</dt>
                <dd className="mt-1 text-sm text-zinc-100">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-labelledby="mounted-heading" className={cardClass}>
        <h2 id="mounted-heading" className="text-lg font-semibold">
          Gemonteerd
        </h2>
        {mounted.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">Er zit nog niets op deze kart.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800/80">
            {mounted.map((installation) => {
              const part = installation.parts!;
              return (
                <li key={installation.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{partLabel(part, t)}</p>
                    <p className="text-xs text-zinc-500">
                      {labelFor(t.options.partCategories, part.category)} · sinds {formatDate(installation.installed_at)}
                    </p>
                  </div>
                  <EditOnly>
                    <form action={removePart.bind(null, installation.id, part.id)}>
                      <button type="submit" className={secondaryButtonClass}>
                        Demonteren
                      </button>
                    </form>
                  </EditOnly>
                </li>
              );
            })}
          </ul>
        )}

        <EditOnly>
          <div className="mt-6 border-t border-zinc-800/80 pt-6">
            {stockOptions.length > 0 ? (
              <InstallForm kartId={kart.id} options={stockOptions} />
            ) : (
              <p className="text-sm text-zinc-400">
                Geen onderdelen op voorraad.{" "}
                <Link href="/dashboard/parts" className={linkClass}>
                  Onderdeel toevoegen
                </Link>
              </p>
            )}
          </div>
        </EditOnly>
      </section>

      {history.length > 0 && (
        <section aria-labelledby="history-heading" className={cardClass}>
          <h2 id="history-heading" className="text-lg font-semibold">
            Eerder gemonteerd
          </h2>
          <ul className="mt-4 divide-y divide-zinc-800/80">
            {history.map((installation) => (
              <li key={installation.id} className="py-3 text-sm">
                <p className="text-zinc-200">{partLabel(installation.parts!, t)}</p>
                <p className="text-xs text-zinc-500">
                  {formatDate(installation.installed_at)} – {formatDate(installation.removed_at)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <UsageCards kind="kart" usage={usage} limit={kart.usage_limit_minutes} />

      <ComponentsSection target={target} componentSet="chassis" usage={usage} limits={componentLimits} t={t} />

      <MaintenanceSection target={target} componentSet="chassis" records={kart.maintenance_records} today={todayInAmsterdam()} t={t} />

      <EditSection
        title="Kart bewerken"
        danger={
          <DeleteButton
            action={deleteKart.bind(null, kart.id)}
            label="Kart verwijderen"
            confirmText={`${kart.name} verwijderen? Gemonteerde onderdelen gaan terug naar de voorraad.`}
          />
        }
      >
        <KartForm kart={kart} />
      </EditSection>
    </>
  );
}
