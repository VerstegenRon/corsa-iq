import type { Metadata } from "next";

import { DeleteButton } from "@/components/delete-button";
import { AddSection, EditSection } from "@/components/edit-section";
import { Icon } from "@/components/icons";
import { Chip } from "@/components/meter";
import { PageHeader } from "@/components/page-header";
import { atLimit, LimitReached } from "@/components/plan-lock";
import { cardClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { formatMinutes, sortByLabel } from "@/lib/karting";

import { deleteDriver } from "../track-actions";
import { DriverForm } from "./driver-form";

export const metadata: Metadata = {
  title: "Coureurs — CorsaIQ",
};

export default async function DriversPage() {
  const { supabase, garage } = await getCurrentGarage();

  const { data, error } = await supabase
    .from("drivers")
    .select("id, name, first_name, last_name, race_number, weight_kg, licence_number, user_id, sessions(duration_s)")
    .eq("garage_id", garage.id);
  if (error) throw new Error(error.message);

  // A–Z by last name, then first name; drivers without a last name sort on their first name.
  const drivers = sortByLabel(data.map((d) => ({ ...d, label: `${d.last_name ?? d.first_name} ${d.first_name}` })));
  const onlyOne = drivers.length <= 1;

  return (
    <>
      <PageHeader icon="user" title="Coureurs" subtitle={`${drivers.length} ${drivers.length === 1 ? "coureur" : "coureurs"}`} add="Coureur" />

      {drivers.map((driver) => {
        const minutes = Math.round(driver.sessions.reduce((sum, s) => sum + (s.duration_s ?? 0), 0) / 60);
        const initials = [driver.first_name, driver.last_name]
          .filter(Boolean)
          .map((part) => part!.trim()[0]?.toUpperCase())
          .join("");
        return (
          <section key={driver.id} aria-labelledby={`driver-${driver.id}`} className={cardClass}>
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-base font-semibold text-on-brand"
              >
                {initials || <Icon name="user" className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={`driver-${driver.id}`} className="truncate text-lg font-semibold">
                  {driver.name}
                </h2>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {driver.user_id && <Chip tone="brand">jouw account</Chip>}
                  {driver.weight_kg !== null && <Chip>{String(driver.weight_kg).replace(".", ",")} kg</Chip>}
                  {driver.licence_number && <Chip>licentie {driver.licence_number}</Chip>}
                  <Chip>
                    <Icon name="stopwatch" className="size-3" />
                    {driver.sessions.length} {driver.sessions.length === 1 ? "sessie" : "sessies"} · {formatMinutes(minutes)}
                  </Chip>
                </div>
              </div>
              {driver.race_number && (
                <span className="shrink-0 rounded-xl border-2 border-zinc-700 px-2.5 py-1 font-mono text-xl font-bold tabular-nums">
                  {driver.race_number}
                </span>
              )}
            </div>

            <div className="mt-4 -mx-6 -mb-6 border-t border-zinc-800/80">
              <EditSection
                title="Bewerken"
                danger={
                  <>
                    <DeleteButton
                      action={deleteDriver.bind(null, driver.id)}
                      label="Coureur verwijderen"
                      confirmText={`${driver.name} verwijderen?`}
                    />
                    {(driver.sessions.length > 0 || onlyOne) && (
                      <p className="mt-2 text-xs text-zinc-500">
                        {driver.sessions.length > 0 ? "Coureurs met gereden sessies blijven bewaard." : "Je garage heeft minimaal één coureur nodig."}
                      </p>
                    )}
                  </>
                }
              >
                <DriverForm driver={driver} />
              </EditSection>
            </div>
          </section>
        );
      })}

      <AddSection title="Coureur toevoegen" defaultOpen={drivers.length === 0}>
        {(await atLimit("drivers", drivers.length)) ? <LimitReached counted="drivers" used={drivers.length} /> : <DriverForm />}
      </AddSection>
    </>
  );
}
