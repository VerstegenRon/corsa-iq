import type { Metadata } from "next";
import Link from "next/link";

import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { PART_CATEGORIES, formatCents, formatMinutes, labelFor } from "@/lib/karting";

import { TrackProgress } from "./track-progress";

export const metadata: Metadata = {
  title: "Dashboard — CorsaIQ",
};

export default async function DashboardPage() {
  const { supabase, user, garage } = await getCurrentGarage();

  const [karts, parts, installed, season, progress, limitedParts, usage] = await Promise.all([
    supabase.from("karts").select("id", { count: "exact", head: true }).eq("garage_id", garage.id),
    supabase.from("parts").select("id", { count: "exact", head: true }).eq("garage_id", garage.id),
    supabase
      .from("parts")
      .select("id", { count: "exact", head: true })
      .eq("garage_id", garage.id)
      .eq("status", "installed"),
    supabase
      .from("seasons")
      .select("id, name, expenses(amount_cents)")
      .eq("garage_id", garage.id)
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("best_lap_ms, events!inner(id, name, starts_on, garage_id, tracks(id, name))")
      .eq("events.garage_id", garage.id)
      .not("best_lap_ms", "is", null),
    supabase
      .from("parts")
      .select("id, category, brand, model, usage_limit_minutes")
      .eq("garage_id", garage.id)
      .not("usage_limit_minutes", "is", null)
      .in("status", ["in_stock", "installed"]),
    supabase.from("part_usage").select("part_id, minutes_since_reset").eq("garage_id", garage.id),
  ]);

  // Parts at 90% or more of their revision limit, most urgent first.
  const minutesSinceReset = new Map((usage.data ?? []).map((u) => [u.part_id, u.minutes_since_reset ?? 0]));
  const dueParts = (limitedParts.data ?? [])
    .map((part) => ({ ...part, minutes: minutesSinceReset.get(part.id) ?? 0, limit: part.usage_limit_minutes! }))
    .filter((part) => part.minutes >= part.limit * 0.9)
    .sort((a, b) => b.minutes / b.limit - a.minutes / a.limit);

  const stats = [
    { label: "Karts", value: String(karts.count ?? 0), href: "/dashboard/karts" },
    { label: "Onderdelen", value: String(parts.count ?? 0), href: "/dashboard/parts" },
    { label: "Gemonteerd", value: String(installed.count ?? 0), href: "/dashboard/parts" },
    season.data
      ? {
          label: `Kosten ${season.data.name}`,
          value: formatCents(season.data.expenses.reduce((sum, e) => sum + e.amount_cents, 0)),
          href: `/dashboard/costs?season=${season.data.id}`,
        }
      : { label: "Kosten", value: formatCents(0), href: "/dashboard/costs" },
  ];

  return (
    <>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">{garage.name}</h1>
        <p className="mt-2 text-sm text-zinc-400">Ingelogd als {user.email}</p>
      </section>

      <section aria-label="Overzicht" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className={`${cardClass} transition-colors hover:border-cyan-400/40`}>
            <p className="text-sm text-zinc-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{stat.value}</p>
          </Link>
        ))}
      </section>

      {karts.count === 0 && (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Begin met je kart</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Voeg je chassis toe en daarna je motor, banden en andere onderdelen.{" "}
            <Link href="/dashboard/karts" className={linkClass}>
              Kart toevoegen
            </Link>
          </p>
        </section>
      )}

      {dueParts.length > 0 && (
        <section aria-labelledby="due-heading" className={`${cardClass} border-amber-400/30`}>
          <h2 id="due-heading" className="text-lg font-semibold">
            Onderhoud nodig
          </h2>
          <ul className="mt-3 divide-y divide-zinc-800/80">
            {dueParts.map((part) => (
              <li key={part.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm">
                <Link href={`/dashboard/parts/${part.id}`} className={linkClass}>
                  {[part.brand, part.model].filter(Boolean).join(" ") || labelFor(PART_CATEGORIES, part.category)}
                </Link>
                <span className="text-zinc-400 tabular-nums">
                  {formatMinutes(part.minutes)} / {formatMinutes(part.limit)} sinds revisie
                  <span className={`ml-2 text-xs ${part.minutes >= part.limit ? "text-red-300" : "text-amber-300"}`}>
                    {part.minutes >= part.limit ? "revisie nodig" : "bijna"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TrackProgress sessions={progress.data ?? []} />
    </>
  );
}
