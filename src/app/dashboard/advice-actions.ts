"use server";

import { explainInsights, type AnalysisLength } from "@/lib/advice-explainer";
import { getCurrentGarage } from "@/lib/garage";
import { findInsights } from "@/lib/setup-advisor";

import { loadAdvisorSessions } from "./advice/load";

/** Claude's plain-language reading of the findings, worked out again here from the garage's own sessions. */
export async function explainAdvice(trackId: string | null, length: AnalysisLength): Promise<{ text: string } | { error: string }> {
  const { supabase, garage } = await getCurrentGarage();
  const sessions = await loadAdvisorSessions(supabase, garage.id, trackId);
  return explainInsights(findInsights(sessions), length === "short" ? "short" : "full");
}
