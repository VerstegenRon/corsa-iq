"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import { getCurrentGarage } from "@/lib/garage";
import { isExpenseCategory } from "@/lib/karting";
import { RECEIPT_BUCKET } from "@/lib/receipts";

import { optionalNumber, text } from "./form-data";

export async function createExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const category = text(formData, "category");
  if (!category || !isExpenseCategory(category)) return { error: "Kies een categorie." };

  const spentOn = text(formData, "spent_on");
  if (!spentOn) return { error: "Vul de datum in." };

  const amount = optionalNumber(formData, "amount");
  if (amount === undefined || amount === null || amount === 0) {
    return { error: "Vul een geldig bedrag in, bijvoorbeeld 85 of 249,95." };
  }

  const { supabase, garage } = await getCurrentGarage();

  // An expense for an event always counts towards that event's season.
  const eventId = text(formData, "event_id");
  let seasonId = text(formData, "season_id");
  if (eventId) {
    const { data: event, error } = await supabase
      .from("events")
      .select("season_id")
      .eq("id", eventId)
      .eq("garage_id", garage.id)
      .maybeSingle();
    if (error || !event) return { error: "Dit evenement bestaat niet meer." };
    seasonId = event.season_id;
  }

  // Uploaded by the browser; only accept files inside this garage's folder.
  const receiptPath = text(formData, "receipt_path");
  if (receiptPath && !new RegExp(`^${garage.id}/[\\w-]+\\.[a-z]+$`).test(receiptPath)) {
    return { error: "Het bonnetje kon niet gekoppeld worden. Probeer het opnieuw." };
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
  if (error) return { error: `Opslaan mislukt: ${error.message}` };

  revalidatePath("/dashboard", "layout");
  return { success: "Uitgave opgeslagen." };
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
  if (error) throw new Error(`Verwijderen mislukt: ${error.message}`);
  if (expense?.receipt_path) await supabase.storage.from(RECEIPT_BUCKET).remove([expense.receipt_path]);
  revalidatePath("/dashboard", "layout");
}
