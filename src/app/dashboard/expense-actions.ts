"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import { dbErrorText } from "@/lib/db-error";
import { getCurrentGarage } from "@/lib/garage";
import { format } from "@/lib/i18n/locales";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { isExpenseCategory } from "@/lib/karting";
import { isReadableReceiptType, readReceipt, type ReceiptFields } from "@/lib/receipt-reader";
import { RECEIPT_BUCKET } from "@/lib/storage";
import { lockedError } from "@/lib/plan-access";

import { optionalNumber, text } from "./form-data";

const failed = async (template: string, error: { message: string; code?: string }) => format(template, { error: await dbErrorText(error) });

/** The receipt description is written in the reader's language. */
const LANGUAGE_NAMES = { nl: "Nederlands", en: "English", de: "Deutsch", fr: "Français" } as const;

export async function createExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const tc = (await getDictionary()).costs;
  const category = text(formData, "category");
  if (!category || !isExpenseCategory(category)) return { error: tc.chooseCategory };

  const spentOn = text(formData, "spent_on");
  if (!spentOn) return { error: tc.dateMissing };

  const amount = optionalNumber(formData, "amount");
  if (amount === undefined || amount === null || amount === 0) {
    return { error: tc.invalidAmount };
  }

  const { supabase, garage } = await getCurrentGarage();

  // An expense for an event always counts towards that event's season.
  const eventId = text(formData, "event_id");
  let seasonId = text(formData, "season_id");
  if (eventId) {
    const { data: event, error } = await supabase.from("events").select("season_id").eq("id", eventId).eq("garage_id", garage.id).maybeSingle();
    if (error || !event) return { error: tc.eventGone };
    seasonId = event.season_id;
  }

  // Uploaded by the browser; only accept files inside this garage's folder.
  const receiptPath = text(formData, "receipt_path");
  if (receiptPath && !new RegExp(`^${garage.id}/[\\w-]+\\.[a-z]+$`).test(receiptPath)) {
    return { error: tc.receiptLinkFailed };
  }

  const { error } = await supabase.from("expenses").insert({
    garage_id: garage.id,
    season_id: seasonId,
    event_id: eventId,
    category,
    spent_on: spentOn,
    amount_cents: Math.round(amount * 100),
    description: text(formData, "description"),
    receipt_path: receiptPath,
  });
  if (error) return { error: await failed(tc.saveFailed, error) };

  revalidatePath("/dashboard", "layout");
  return { success: tc.saved };
}

export async function deleteExpense(expenseId: string) {
  const { supabase, garage } = await getCurrentGarage();
  const { data: expense, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("garage_id", garage.id)
    .select("receipt_path")
    .maybeSingle();
  if (error) throw new Error(await failed((await getDictionary()).costs.deleteFailed, error));
  if (expense?.receipt_path) await supabase.storage.from(RECEIPT_BUCKET).remove([expense.receipt_path]);
  revalidatePath("/dashboard", "layout");
}

export type ReadReceiptResult = { fields: ReceiptFields } | { error: string };

/** Reads an uploaded receipt (already in this garage's storage folder) into expense fields. */
export async function readUploadedReceipt(receiptPath: string): Promise<ReadReceiptResult> {
  const locked = await lockedError("receipts");
  if (locked) return { error: locked };
  const [{ supabase, garage }, t, locale] = await Promise.all([getCurrentGarage(), getDictionary(), getLocale()]);
  const tc = t.costs;
  if (!new RegExp(`^${garage.id}/[\\w-]+\\.[a-z]+$`).test(receiptPath)) return { error: tc.unknownReceipt };

  const { data: file, error } = await supabase.storage.from(RECEIPT_BUCKET).download(receiptPath);
  if (error || !file) return { error: tc.fetchFailed };
  if (!isReadableReceiptType(file.type)) {
    return { error: tc.unreadableType };
  }

  try {
    return { fields: await readReceipt({ data: await file.arrayBuffer(), type: file.type }, LANGUAGE_NAMES[locale]) };
  } catch (cause) {
    if (cause instanceof Anthropic.AuthenticationError || !process.env.ANTHROPIC_API_KEY) {
      return { error: tc.notConfigured };
    }
    if (cause instanceof Anthropic.RateLimitError) return { error: tc.busy };
    console.error("Reading receipt failed", cause);
    return { error: tc.readFailed };
  }
}
