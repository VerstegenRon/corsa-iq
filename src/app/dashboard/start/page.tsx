import type { Metadata } from "next";
import Link from "next/link";

import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { ownOrOfficial, sortByLabel, todayInAmsterdam, trackLabel } from "@/lib/karting";

import { DriverStep, EventStep, KartStep, TeamStep } from "./start-forms";

export const metadata: Metadata = {
  title: "Aan de slag — CorsaIQ",
};

const STEPS = ["Team", "Coureur", "Kart", "Evenement"] as const;

/** The coming Saturday (today when it is Saturday): the usual day for a first training. */
function nextSaturday(today: string) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + ((6 - date.getUTCDay() + 7) % 7));
  return date.toISOString().slice(0, 10);
}

/** The start route of a new garage: four short steps, each one skippable. */
export default async function StartPage({ searchParams }: PageProps<"/dashboard/start">) {
  const query = await searchParams;
  const { supabase, user, garage, canManageTeam } = await getCurrentGarage();
  const step = Math.min(5, Math.max(1, Number(query.stap) || 1));

  const [{ data: profile }, { data: driver }, { data: tracks }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("drivers").select("id, first_name, last_name, race_number").eq("garage_id", garage.id).order("created_at").limit(1).maybeSingle(),
    step === 4
      ? supabase.from("tracks").select("id, name, city, country").or(ownOrOfficial(garage.id))
      : Promise.resolve({ data: [] as { id: string; name: string; city: string | null; country: string | null }[] }),
  ]);

  if (!canManageTeam) {
    return (
      <section className={cardClass}>
        <p className="text-zinc-300">De eigenaar van het team richt de garage in. Je kunt meteen aan de slag in Vandaag.</p>
        <Link href="/dashboard/vandaag" className={`${primaryButtonClass} mt-4`}>
          Naar Vandaag
        </Link>
      </section>
    );
  }

  return (
    <>
      <section>
        <p className="channel-label mb-2">{step <= 4 ? `Aan de slag · stap ${step} van 4` : "Aan de slag · klaar"}</p>
        <h1 className="text-3xl sm:text-4xl">
          {["Je team", "Wie rijdt er", "Je kart", "Wanneer rij je", "Klaar voor de baan"][step - 1]}
          <span className="text-brand-400">{step === 2 || step === 4 ? "?" : "."}</span>
        </h1>
      </section>

      <ol aria-label="Stappen" className="grid grid-cols-4 gap-1">
        {STEPS.map((name, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "now" : "todo";
          return (
            <li key={name}>
              <Link
                href={`/dashboard/start?stap=${n}`}
                aria-current={state === "now" ? "step" : undefined}
                className={`flex flex-col gap-1 border-t-4 pt-2 text-xs sm:text-sm ${
                  state === "done" ? "border-brand-400 text-zinc-300" : state === "now" ? "border-zinc-50 font-bold text-zinc-50" : "border-zinc-800 text-zinc-500"
                }`}
              >
                <span className="font-mono">{state === "done" ? "✓" : `0${n}`}</span>
                <span className="truncate">{name}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      <section className={cardClass}>
        {step === 1 && (
          <>
            <p className="mb-5 text-sm text-zinc-400">Hoe heet je team? Die naam zien je teamleden als je ze uitnodigt.</p>
            <TeamStep garageName={garage.name} displayName={profile?.display_name ?? ""} />
          </>
        )}
        {step === 2 && (
          <>
            <p className="mb-5 text-sm text-zinc-400">De coureur van deze kart. Zijn of haar naam staat bij elke sessie, setup en debrief.</p>
            <DriverStep driver={driver ?? null} />
          </>
        )}
        {step === 3 && (
          <>
            <p className="mb-5 text-sm text-zinc-400">Met de kart houdt CorsaIQ de uren van chassis en motor bij, en hangen setups en pre-start eraan.</p>
            <KartStep />
          </>
        )}
        {step === 4 && (
          <>
            <p className="mb-5 text-sm text-zinc-400">Je eerste training of race. Daarna staat alles klaar in Vandaag: pre-start, Live en de paklijst.</p>
            <EventStep tracks={sortByLabel((tracks ?? []).map((t) => ({ id: t.id, label: trackLabel(t) })))} defaultDate={nextSaturday(todayInAmsterdam())} />
          </>
        )}
        {step === 5 && (
          <div className="flex flex-col gap-4">
            <p className="text-zinc-300">Je garage staat klaar. Wat je nu kunt doen:</p>
            <ul className="flex flex-col gap-2 text-sm text-zinc-300">
              <li>
                <strong className="text-zinc-50">Vandaag</strong>: de pre-start voor je volgende sessie, met bandenspanning en checklist.
              </li>
              <li>
                <strong className="text-zinc-50">Team</strong>: nodig je monteur, coureur of ouders uit met een link.
              </li>
              <li>
                <strong className="text-zinc-50">Live</strong>: volg een sessie met de stopwatch, voor het hele team tegelijk.
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/vandaag" className={primaryButtonClass}>
                Naar Vandaag
              </Link>
              <Link href="/dashboard/team" className={secondaryButtonClass}>
                Team uitnodigen
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
