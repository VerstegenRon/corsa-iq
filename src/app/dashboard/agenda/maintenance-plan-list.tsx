// The planned maintenance, soonest first: what, why, and before which event.

import Link from "next/link";

import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/karting";
import { formatHours, jobSentence, jobTitle, type PlannedJob } from "@/lib/maintenance-plan";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export function MaintenancePlanList({ jobs, showEvent = true, empty }: { jobs: PlannedJob[]; showEvent?: boolean; empty?: string }) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        {empty ??
          "Niets te plannen: geen enkele limiet wordt bij je komende evenementen overschreden. Stel limieten in bij je karts en onderdelen om dit te laten volgen."}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-800/80">
      {jobs.map((job) => (
        <li key={job.key}>
          <Link href={job.href} className={`flex items-start gap-3 py-3 hover:text-white ${focusRing}`}>
            <span
              aria-hidden="true"
              className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full ${
                job.dueNow ? "bg-red-400/15 text-red-300" : "bg-amber-400/15 text-amber-300"
              }`}
            >
              <Icon name={job.kind === "kart" ? "kart" : "engine"} className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium text-zinc-100">{jobTitle(job)}</span>
                <span className={`text-xs font-medium ${job.dueNow ? "text-red-300" : "text-amber-200"}`}>
                  {job.dueNow ? "Nu aan de beurt" : `Uiterlijk ${formatDate(job.dueBy)}`}
                </span>
              </span>
              <span className="mt-0.5 block text-sm text-zinc-400">
                {jobSentence(job)}
                {showEvent && job.event && ` Plan het vóór ${job.event.name} (${formatDate(job.event.starts_on)}).`}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {job.estimated
                  ? `Geschat op ${formatHours(job.perEventMinutes)} per evenement; er zijn nog geen vorige evenementen met looptijden.`
                  : `± ${formatHours(job.perEventMinutes)} per evenement, het gemiddelde van de vorige evenementen.`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
