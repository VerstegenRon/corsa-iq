import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/delete-button";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import {
  ENGINE_COMPONENTS,
  MAINTENANCE_TYPES,
  PART_CATEGORIES,
  PART_STATUSES,
  formatCents,
  formatDate,
  formatMinutes,
  labelFor,
  sortedEntries,
  todayInAmsterdam,
} from "@/lib/karting";
import { computePartUsage } from "@/lib/part-usage";

import { deleteMaintenance, deletePart } from "../../actions";
import { PartForm } from "../part-form";
import { MaintenanceForm } from "./maintenance-form";

export const metadata: Metadata = {
  title: "Onderdeel — CorsaIQ",
};

/** Share of the limit used: below 90% normal, from 90% warning, at 100% due. */
function limitState(minutes: number, limit: number | null) {
  if (limit === null) return null;
  const share = minutes / limit;
  return { share, tone: share >= 1 ? "due" : share >= 0.9 ? "soon" : "ok" } as const;
}

const toneClass = { ok: "bg-cyan-400", soon: "bg-amber-400", due: "bg-red-400" };

export default async function PartPage({ params }: PageProps<"/dashboard/parts/[id]">) {
  const { id } = await params;
  const { supabase, garage } = await getCurrentGarage();

  const { data: part, error } = await supabase
    .from("parts")
    .select(
      "id, category, brand, model, serial_number, status, purchased_on, purchase_price_cents, usage_limit_minutes, notes, part_installations(removed_at, karts(id, name)), session_parts(sessions(started_at, duration_s)), maintenance_records(id, performed_on, type, performed_by, description, resets_usage, components, created_at, expenses(amount_cents))",
    )
    .eq("id", id)
    .eq("garage_id", garage.id)
    .order("performed_on", { referencedTable: "maintenance_records", ascending: false })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!part) notFound();

  const name = [part.brand, part.model].filter(Boolean).join(" ") || labelFor(PART_CATEGORIES, part.category);
  const kart = part.part_installations.find((i) => i.removed_at === null)?.karts;
  const isEngine = part.category === "engine";
  const sessions = part.session_parts.flatMap((sp) => (sp.sessions ? [sp.sessions] : []));
  const records = part.maintenance_records;
  const usage = computePartUsage(sessions, records, Object.keys(ENGINE_COMPONENTS));
  const limit = limitState(usage.sinceResetMinutes, part.usage_limit_minutes);

  const details = [
    ["Status", kart ? `Op ${kart.name}` : labelFor(PART_STATUSES, part.status)],
    ["Sessies", String(sessions.length)],
    [
      "Aankoop",
      part.purchased_on || part.purchase_price_cents !== null
        ? `${formatDate(part.purchased_on)} · ${formatCents(part.purchase_price_cents)}`
        : "—",
    ],
    ["Laatste revisie", usage.lastResetOn ? formatDate(usage.lastResetOn) : "nog niet"],
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

      <section aria-label="Draaitijd" className="grid gap-4 sm:grid-cols-2">
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">Totale draaitijd</p>
          <p className="mt-2 text-3xl font-semibold">{formatMinutes(usage.totalMinutes)}</p>
          <p className="mt-1 text-xs text-zinc-500">Loopt altijd door, ook na revisies en vervangen onderdelen.</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-zinc-400">Sinds laatste revisie</p>
          <p className="mt-2 text-3xl font-semibold">
            {formatMinutes(usage.sinceResetMinutes)}
            {part.usage_limit_minutes !== null && (
              <span className="text-base font-normal text-zinc-500"> / {formatMinutes(part.usage_limit_minutes)}</span>
            )}
          </p>
          {limit ? (
            <>
              <div
                role="meter"
                aria-label="Deel van de revisiegrens gebruikt"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(limit.share, 1) * 100)}
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"
              >
                <div className={`h-full rounded-full ${toneClass[limit.tone]}`} style={{ width: `${Math.min(limit.share, 1) * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {limit.tone === "due"
                  ? "Revisie nodig."
                  : `Nog ${formatMinutes(part.usage_limit_minutes! - usage.sinceResetMinutes)} tot de revisiegrens.`}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">Stel bij Bewerken een revisiegrens in om te zien wanneer het tijd is.</p>
          )}
        </div>
      </section>

      {isEngine && (
        <section aria-labelledby="components-heading" className={cardClass}>
          <h2 id="components-heading" className="text-lg font-semibold">
            Componenten
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Draaitijd sinds elk component voor het laatst is vervangen of gereviseerd.</p>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th scope="col" className="py-2 pr-4 font-medium">Component</th>
                <th scope="col" className="py-2 pr-4 font-medium">Laatst gedaan</th>
                <th scope="col" className="py-2 text-right font-medium">Draaitijd sindsdien</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {sortedEntries(ENGINE_COMPONENTS).map(([key, label]) => {
                const component = usage.components[key];
                return (
                  <tr key={key}>
                    <td className="py-2 pr-4 text-zinc-200">{label}</td>
                    <td className="py-2 pr-4 text-zinc-400">{component.lastOn ? formatDate(component.lastOn) : "nog niet (sinds nieuw)"}</td>
                    <td className="py-2 text-right text-zinc-200 tabular-nums">{formatMinutes(component.minutes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section aria-labelledby="maintenance-heading" className={cardClass}>
        <h2 id="maintenance-heading" className="text-lg font-semibold">
          Onderhoud
        </h2>
        {records.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">Nog geen onderhoud vastgelegd.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800/80">
            {records.map((record) => {
              const cost = record.expenses.reduce((sum, e) => sum + e.amount_cents, 0);
              const title = `${labelFor(MAINTENANCE_TYPES, record.type)} van ${formatDate(record.performed_on)}`;
              return (
                <li key={record.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100">
                      {labelFor(MAINTENANCE_TYPES, record.type)}
                      <span className="font-normal text-zinc-500">
                        {" "}
                        · {formatDate(record.performed_on)}
                        {record.performed_by && ` · ${record.performed_by}`}
                        {record.resets_usage && " · teller op nul"}
                      </span>
                    </p>
                    {record.components.length > 0 && (
                      <p className="mt-1 text-xs text-zinc-400">
                        {record.components.map((c) => labelFor(ENGINE_COMPONENTS, c)).join(" · ")}
                      </p>
                    )}
                    {record.description && <p className="mt-1 text-xs text-zinc-500">{record.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {cost > 0 && <span className="text-sm tabular-nums">{formatCents(cost)}</span>}
                    <DeleteButton
                      compact
                      action={deleteMaintenance.bind(null, record.id)}
                      label={`${title} verwijderen`}
                      confirmText={`${title} verwijderen?${cost > 0 ? " De kosten verdwijnen ook uit je overzicht." : ""} De tellers rekenen dan weer vanaf het vorige onderhoud.`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-6 border-t border-zinc-800/80 pt-6">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">Onderhoud vastleggen</h3>
          <MaintenanceForm partId={part.id} isEngine={isEngine} today={todayInAmsterdam()} />
          <p className="mt-3 text-xs text-zinc-500">
            Sessies op de dag van het onderhoud tellen nog mee voor de oude stand; vanaf de volgende dag begint de teller opnieuw.
          </p>
        </div>
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
          {sessions.length > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              Gebruikt in sessies: verwijderen kan niet, zet de status op “Afgeschreven” of “Verkocht”.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
