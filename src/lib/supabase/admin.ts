import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

/**
 * Supabase with the secret key: bypasses row-level security. Only for server code without a user
 * session, like the Stripe webhook, and only for the rows that code is about.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing SUPABASE_SECRET_KEY (Supabase dashboard → Project Settings → API Keys).");
  return createClient<Database>(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
