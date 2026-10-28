import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { signOut } from "../login/actions";

export const metadata: Metadata = {
  title: "Dashboard — CorsaIQ",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS limits these to garages the user is a member of.
  const { data: garages } = await supabase
    .from("garages")
    .select("id, name, plan, drivers(name)")
    .order("created_at");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-cyan-300 uppercase">CorsaIQ</p>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-cyan-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Uitloggen
          </button>
        </form>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 pb-20">
        <section className="pt-8">
          <h1 className="text-3xl font-semibold tracking-tight">Je garage</h1>
          <p className="mt-2 text-sm text-zinc-400">Ingelogd als {user.email}</p>
        </section>

        <section aria-labelledby="garages-heading">
          <h2 id="garages-heading" className="sr-only">
            Garages
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {garages?.map((garage) => (
              <article
                key={garage.id}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6"
              >
                <p className="text-xs font-medium tracking-wide text-cyan-200 uppercase">
                  {garage.plan}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{garage.name}</h3>
                <p className="mt-3 text-sm text-zinc-400">
                  Coureurs: {garage.drivers.map((driver) => driver.name).join(", ") || "—"}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
