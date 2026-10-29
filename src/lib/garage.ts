import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type GarageRole = "owner" | "mechanic" | "driver" | "viewer";

/** The garage chosen on this device, when someone is in more than one. */
export const GARAGE_COOKIE = "corsaiq_garage";

/** What each role may do; the database enforces the same rules (row-level security). */
export function permissions(role: GarageRole) {
  return {
    /** Racing and material data: sessions, setups, karts, parts, Vandaag, Live, lists. */
    canEdit: role !== "viewer",
    canSeeCosts: role === "owner" || role === "mechanic",
    canManageTeam: role === "owner",
  };
}

/**
 * The signed-in user, the garage they work in and their role there: the garage chosen on this
 * device, else the one they joined last (an invited mechanic lands in the team's garage, not in the
 * empty one made at sign-up).
 */
export const getCurrentGarage = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: memberships, error }, cookieStore] = await Promise.all([
    supabase
      .from("garage_members")
      .select("role, created_at, garages(id, name, plan, currency)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    cookies(),
  ]);
  if (error) throw new Error(`Could not load garage: ${error.message}`);

  const garages = (memberships ?? []).flatMap((m) => (m.garages ? [{ ...m.garages, role: m.role as GarageRole }] : []));
  if (garages.length === 0) throw new Error("Could not load garage: no membership");
  const chosen = cookieStore.get(GARAGE_COOKIE)?.value;
  const current = garages.find((g) => g.id === chosen) ?? garages[0];
  const { role, ...garage } = current;

  return { supabase, user, garage, role, ...permissions(role), garages };
});
