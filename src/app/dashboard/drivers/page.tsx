import type { Metadata } from "next";

import { DeleteButton } from "@/components/delete-button";
import { AddSection, EditSection } from "@/components/edit-section";
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
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Coureurs</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Wie er rijdt in je garage, bijvoorbeeld jij en je zoon of dochter, of de coureurs van je team.
        </p>
      </section>

      {drivers.map((driver) => {
        const minutes = Math.round(driver.sessions.reduce((sum, s) => sum + (s.duration_s ?? 0), 0) / 60);
        const details = [
          driver.race_number && `#${driver.race_number}`,
          driver.weight_kg !== null && `${String(driver.weight_kg).replace(".", ",")} kg`,
          driver.licence_number && `licentie ${driver.licence_number}`,
        ].filter(Boolean);
        return (
          <section key={driver.id} aria-labelledby={`driver-${driver.id}`} className={cardClass}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`driver-${driver.id}`} className="text-lg font-semibold">
                {driver.name}
                {driver.user_id && <span className="ml-2 text-xs font-normal text-zinc-500">jouw account</span>}
              </h2>
              <p className="text-sm text-zinc-400">
                {driver.sessions.length} {driver.sessions.length === 1 ? "sessie" : "sessies"} · {formatMinutes(minutes)}
              </p>
            </div>
            {details.length > 0 && <p className="mt-1 text-sm text-zinc-500">{details.join(" · ")}</p>}

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
                        {driver.sessions.length > 0
                          ? "Coureurs met gereden sessies blijven bewaard."
                          : "Je garage heeft minimaal één coureur nodig."}
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
        <DriverForm />
      </AddSection>
    </>
  );
}
