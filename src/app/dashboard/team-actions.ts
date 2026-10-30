"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/form-message";
import { dbErrorText } from "@/lib/db-error";
import { getPlanAccess } from "@/lib/plan-access";
import { GARAGE_COOKIE, getCurrentGarage, type GarageRole } from "@/lib/garage";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
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
  const t = (await getDictionary()).team;
  if (!ROLES.includes(role as GarageRole)) return { error: t.chooseRole };
  const { supabase, garage, canManageTeam } = await getCurrentGarage();
  if (!canManageTeam) return { error: t.ownerInvites };
  const allowed = (await getPlanAccess()).limit("members");
  if (allowed !== null) {
    // Open invitations hold a seat, like on the team page.
    const [{ count: members }, { count: open }] = await Promise.all([
      supabase.from("garage_members").select("user_id", { count: "exact", head: true }).eq("garage_id", garage.id),
      supabase
        .from("garage_invites")
        .select("id", { count: "exact", head: true })
        .eq("garage_id", garage.id)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString()),
    ]);
    if ((members ?? 0) + (open ?? 0) >= allowed)
      return { error: format(t.inviteFailed, { error: await dbErrorText({ message: "plan_limit:members" }) }) };
  }
  const { data, error } = await supabase
    .from("garage_invites")
    .insert({ garage_id: garage.id, role, label: label.trim().slice(0, 80) || null })
    .select("token")
    .single();
  if (error) return { error: format(t.inviteFailed, { error: await dbErrorText(error) }) };
  revalidatePath("/dashboard/team");
  return { success: t.inviteCreated, token: data.token };
}

export async function revokeInvite(inviteId: string): Promise<FormState> {
  const t = (await getDictionary()).team;
  const { supabase, garage } = await getCurrentGarage();
  const { error } = await supabase
    .from("garage_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("garage_id", garage.id);
  if (error) return { error: format(t.revokeFailed, { error: await dbErrorText(error) }) };
  revalidatePath("/dashboard/team");
  return { success: t.revoked };
}

export async function changeRole(userId: string, role: string): Promise<FormState> {
  const t = (await getDictionary()).team;
  if (!ROLES.includes(role as GarageRole)) return { error: t.chooseRole };
  const { supabase, garage, canManageTeam } = await getCurrentGarage();
  if (!canManageTeam) return { error: t.ownerRoles };
  const { error } = await supabase.from("garage_members").update({ role }).eq("garage_id", garage.id).eq("user_id", userId);
  if (error)
    return { error: error.message.includes("at least one owner") ? t.keepOwner : format(t.changeFailed, { error: await dbErrorText(error) }) };
  revalidatePath("/dashboard", "layout");
  return { success: t.roleChanged };
}

/** An owner removes someone, or a member leaves the garage. */
export async function removeMember(userId: string): Promise<FormState> {
  const t = (await getDictionary()).team;
  const { supabase, user, garage, canManageTeam } = await getCurrentGarage();
  if (userId !== user.id && !canManageTeam) return { error: t.ownerRemoves };
  const { error } = await supabase.from("garage_members").delete().eq("garage_id", garage.id).eq("user_id", userId);
  if (error)
    return {
      error: error.message.includes("at least one owner") ? t.keepOwnerFirst : format(t.removeFailed, { error: await dbErrorText(error) }),
    };
  if (userId === user.id) {
    (await cookies()).delete(GARAGE_COOKIE);
    redirect("/dashboard");
  }
  revalidatePath("/dashboard/team");
  return { success: t.removed };
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
  const t = (await getDictionary()).team;
  if (error) {
    const message = error.message.includes("expired")
      ? t.inviteExpired
      : error.message.includes("already used")
        ? t.inviteUsed
        : error.message.includes("not found")
          ? t.inviteMissing
          : format(t.joinFailed, { error: await dbErrorText(error) });
    return { error: message };
  }
  await chooseGarage(garageId);
  redirect("/dashboard/vandaag");
}
