"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import { dbError } from "@/lib/db-error";
import { getCurrentGarage } from "@/lib/garage";
import { CORNERS, chainStatus, type CheckStatus } from "@/lib/prestart";
import { lockedError } from "@/lib/plan-access";

// ---------------------------------------------------------------------------
// Pre-start checklist: one round per event, kart and coming session; made on its first reading.
// ---------------------------------------------------------------------------

export type PrestartContext = { eventId: string; kartId: string; label: string; type: string; setupId: string | null };

const SESSION_TYPES = ["practice", "qualifying", "heat", "prefinal", "final", "test"];

async function ensureCheck(ctx: PrestartContext) {
  if (!/^[A-Z]{1,2}\d{1,2}$/.test(ctx.label) || !SESSION_TYPES.includes(ctx.type)) return { error: "Onbekende sessie." };
  const { supabase, user, garage } = await getCurrentGarage();
  const { data: existing } = await supabase
    .from("prestart_checks")
    .select("id")
    .eq("event_id", ctx.eventId)
    .eq("kart_id", ctx.kartId)
    .eq("session_label", ctx.label)
    .maybeSingle();
  if (existing) return { supabase, user, garage, id: existing.id };
  const { data, error } = await supabase
    .from("prestart_checks")
    .insert({
      garage_id: garage.id,
      event_id: ctx.eventId,
      kart_id: ctx.kartId,
      session_label: ctx.label,
      session_type: ctx.type,
      setup_id: ctx.setupId,
    })
    .select("id")
    .single();
  if (error) return { error: `Checklist starten mislukt: ${dbError(error)}` };
  return { supabase, user, garage, id: data.id };
}

export async function saveTyreReading(ctx: PrestartContext, corner: string, value: number): Promise<FormState> {
  const locked = await lockedError("prestart");
  if (locked) return { error: locked };
  if (!(CORNERS as readonly string[]).includes(corner)) return { error: "Onbekende band." };
  if (!Number.isFinite(value) || value < 0.2 || value > 3) return { error: "Vul een druk in tussen 0,20 en 3,00 bar." };
  const check = await ensureCheck(ctx);
  if ("error" in check) return { error: check.error };
  const { error } = await check.supabase
    .from("tyre_pressure_readings")
    .insert({ garage_id: check.garage.id, prestart_check_id: check.id, corner, temp_state: "cold", bar: Math.round(value * 1000) / 1000 });
  if (error) return { error: `Meting opslaan mislukt: ${dbError(error)}` };
  revalidatePath("/dashboard/vandaag");
  return {};
}

const CHECK_KEYS = ["gearing", "chain", "main_jet", "tyre_set"];

/** One check: confirmed (ok) or reopened; the chain slack is a measurement in mm. */
export async function setCheck(ctx: PrestartContext, key: string, input: { value?: string | null; done?: boolean }): Promise<FormState> {
  const locked = await lockedError("prestart");
  if (locked) return { error: locked };
  if (!CHECK_KEYS.includes(key)) return { error: "Onbekende controle." };
  let status: CheckStatus = input.done ? "ok" : "open";
  let value = input.value ?? null;
  if (key === "chain" && value !== null) {
    const mm = Number(value.replace(",", "."));
    if (!Number.isFinite(mm) || mm < 0 || mm > 60) return { error: "Vul de speling in millimeters in." };
    status = chainStatus(mm);
    value = String(Math.round(mm * 10) / 10);
  }
  const check = await ensureCheck(ctx);
  if ("error" in check) return { error: check.error };
  const { error } = await check.supabase.from("session_checks").upsert(
    {
      garage_id: check.garage.id,
      prestart_check_id: check.id,
      key,
      value,
      status,
      checked_by: check.user.id,
      checked_at: new Date().toISOString(),
    },
    { onConflict: "prestart_check_id,key" },
  );
  if (error) return { error: `Opslaan mislukt: ${dbError(error)}` };
  revalidatePath("/dashboard/vandaag");
  return {};
}

/** Locks the setup for this session: the round and the setup itself record who and when. */
export async function lockSetup(ctx: PrestartContext): Promise<FormState> {
  const locked = await lockedError("prestart");
  if (locked) return { error: locked };
  if (!ctx.setupId) return { error: "Er is nog geen setup voor deze kart om te vergrendelen." };
  const check = await ensureCheck(ctx);
  if ("error" in check) return { error: check.error };
  const now = new Date().toISOString();
  const [round, setup] = await Promise.all([
    check.supabase.from("prestart_checks").update({ locked_at: now, locked_by: check.user.id, setup_id: ctx.setupId }).eq("id", check.id),
    check.supabase.from("setups").update({ locked_at: now, locked_by: check.user.id }).eq("id", ctx.setupId).eq("garage_id", check.garage.id),
  ]);
  const error = round.error ?? setup.error;
  if (error) return { error: `Vergrendelen mislukt: ${dbError(error)}` };
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function unlockSetup(ctx: PrestartContext): Promise<FormState> {
  const locked = await lockedError("prestart");
  if (locked) return { error: locked };
  const check = await ensureCheck(ctx);
  if ("error" in check) return { error: check.error };
  const { error } = await check.supabase.from("prestart_checks").update({ locked_at: null, locked_by: null }).eq("id", check.id);
  if (error) return { error: `Ontgrendelen mislukt: ${dbError(error)}` };
  revalidatePath("/dashboard/vandaag");
  return {};
}
