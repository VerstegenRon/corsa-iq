import type { Metadata } from "next";
import Link from "next/link";

import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { formatCents } from "@/lib/karting";

import { TrackProgress } from "./track-progress";

export const metadata: Metadata = {
  title: "Dashboard — CorsaIQ",
};

export default async function DashboardPage() {
  const { supabase, user, garage } = await getCurrentGarage();

  const [karts, parts, installed, season, progress] = await Promise.all([
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
  ]);

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

      <TrackProgress sessions={progress.data ?? []} />
    </>
  );
}
