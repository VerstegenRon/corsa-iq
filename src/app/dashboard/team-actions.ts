"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/form-message";
import { dbError } from "@/lib/db-error";
import { GARAGE_COOKIE, getCurrentGarage, type GarageRole } from "@/lib/garage";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Team: invitations by link, roles, leaving, and which garage this device works in.
// The database checks every step too (only owners manage members and invitations).
// ---------------------------------------------------------------------------

const ROLES: GarageRole[] = ["owner", "mechanic", "driver", "viewer"];
const YEAR = 60 * 60 * 24 * 365;

async function chooseGarage(garageId: string) {
  (await cookies()).set(GARAGE_COOKIE, garageId, {
    path: "/",
    maxAge: YEAR,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function createInvite(role: string, label: string): Promise<FormState & { token?: string }> {
  if (!ROLES.includes(role as GarageRole)) return { error: "Kies een rol." };
  const { supabase, garage, canManageTeam } = await getCurrentGarage();
  if (!canManageTeam) return { error: "Alleen de eigenaar kan mensen uitnodigen." };
  const { data, error } = await supabase
    .from("garage_invites")
    .insert({ garage_id: garage.id, role, label: label.trim().slice(0, 80) || null })
    .select("token")
    .single();
  if (error) return { error: `Uitnodiging maken mislukt: ${dbError(error)}` };
  revalidatePath("/dashboard/team");
  return { success: "Uitnodiging gemaakt.", token: data.token };
}

export async function revokeInvite(inviteId: string): Promise<FormState> {
  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase
    .from("garage_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("garage_id", garage.id);
  if (error) return { error: `Intrekken mislukt: ${dbError(error)}` };
  revalidatePath("/dashboard/team");
  return { success: "Uitnodiging ingetrokken." };
}

export async function changeRole(userId: string, role: string): Promise<FormState> {
  if (!ROLES.includes(role as GarageRole)) return { error: "Kies een rol." };
  const { supabase, garage, canManageTeam } = await getCurrentGarage();
  if (!canManageTeam) return { error: "Alleen de eigenaar kan rollen wijzigen." };
  const { error } = await supabase.from("garage_members").update({ role }).eq("garage_id", garage.id).eq("user_id", userId);
  if (error)
    return { error: error.message.includes("at least one owner") ? "Er moet altijd een eigenaar blijven." : `Wijzigen mislukt: ${dbError(error)}` };
  revalidatePath("/dashboard", "layout");
  return { success: "Rol gewijzigd." };
}

/** An owner removes someone, or a member leaves the garage. */
export async function removeMember(userId: string): Promise<FormState> {
  const { supabase, user, garage, canManageTeam } = await getCurrentGarage();
  if (userId !== user.id && !canManageTeam) return { error: "Alleen de eigenaar kan iemand verwijderen." };
  const { error } = await supabase.from("garage_members").delete().eq("garage_id", garage.id).eq("user_id", userId);
  if (error)
    return {
      error: error.message.includes("at least one owner")
        ? "Er moet altijd een eigenaar blijven. Maak eerst iemand anders eigenaar."
        : `Verwijderen mislukt: ${dbError(error)}`,
    };
  if (userId === user.id) {
    (await cookies()).delete(GARAGE_COOKIE);
    redirect("/dashboard");
  }
  revalidatePath("/dashboard/team");
  return { success: "Verwijderd uit het team." };
}

export async function switchGarage(garageId: string): Promise<void> {
  const { garages } = await getCurrentGarage();
  if (!garages.some((g) => g.id === garageId)) return;
  await chooseGarage(garageId);
  redirect("/dashboard/vandaag");
}

/** Accepting an invitation: join the garage and work in it on this device from now on. */
export async function acceptInvite(token: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: garageId, error } = await supabase.rpc("accept_garage_invite", { p_token: token });
  if (error) {
    const message = error.message.includes("expired")
      ? "Deze uitnodiging is verlopen. Vraag een nieuwe link."
      : error.message.includes("already used")
        ? "Deze uitnodiging is al gebruikt. Vraag een nieuwe link."
        : error.message.includes("not found")
          ? "Deze uitnodiging bestaat niet (meer)."
          : `Lid worden mislukt: ${dbError(error)}`;
    return { error: message };
  }
  await chooseGarage(garageId);
  redirect("/dashboard/vandaag");
}
