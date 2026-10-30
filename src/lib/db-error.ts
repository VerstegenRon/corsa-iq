// Database errors as a sentence for the person in front of the screen.

import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";

/** Postgres's "insufficient privilege", which row-level security raises on a refused write. */
const NO_PRIVILEGE = "42501";

/** What a full plan is out of room for (raised by the plan-limit triggers as "plan_limit:karts"). */
const PLAN_LIMIT_THINGS: Record<string, string> = { karts: "karts", drivers: "coureurs", members: "teamleden" };

/**
 * The reason a write failed. A refusal by row-level security (a viewer, or a driver touching costs)
 * becomes a plain explanation instead of "new row violates row-level security policy"; so does a
 * plan that is full.
 */
export function dbError(error: { message: string; code?: string }) {
  const full = /^plan_limit:(\w+)/.exec(error.message)?.[1];
  if (full) {
    return `je abonnement heeft geen ruimte voor meer ${PLAN_LIMIT_THINGS[full] ?? full}. Bekijk de abonnementen bij Instellingen → Abonnement.`;
  }
  if (error.code === NO_PRIVILEGE || /row-level security|permission denied/i.test(error.message)) {
    return "je rol in deze garage geeft geen rechten om dit te wijzigen. Vraag de eigenaar als dat wel nodig is.";
  }
  return error.message;
}

/** `dbError` in the reader's language. Server only; screens still on fixed Dutch use `dbError`. */
export async function dbErrorText(error: { message: string; code?: string }) {
  const t = await getDictionary();
  const full = /^plan_limit:(\w+)/.exec(error.message)?.[1];
  if (full) return format(t.errors.planFull, { things: t.errors.planThings[full as keyof typeof t.errors.planThings] ?? full });
  if (error.code === NO_PRIVILEGE || /row-level security|permission denied/i.test(error.message)) return t.errors.noRights;
  return error.message;
}
