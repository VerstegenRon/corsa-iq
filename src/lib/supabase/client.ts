import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Supabase client for Client Components. */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}

/**
 * The client for a Realtime subscription: the signed-in user's token is handed to the socket first,
 * otherwise it listens as a visitor and row-level security lets no change through.
 */
export async function createRealtimeClient() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) await supabase.realtime.setAuth(data.session.access_token);
  return supabase;
}
