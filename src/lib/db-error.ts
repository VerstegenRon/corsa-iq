// Database errors as a sentence for the person in front of the screen.

/** Postgres's "insufficient privilege", which row-level security raises on a refused write. */
const NO_PRIVILEGE = "42501";

/**
 * The reason a write failed. A refusal by row-level security (a viewer, or a driver touching costs)
 * becomes a plain explanation instead of "new row violates row-level security policy".
 */
export function dbError(error: { message: string; code?: string }) {
  if (error.code === NO_PRIVILEGE || /row-level security|permission denied/i.test(error.message)) {
    return "je rol in deze garage geeft geen rechten om dit te wijzigen. Vraag de eigenaar als dat wel nodig is.";
  }
  return error.message;
}
