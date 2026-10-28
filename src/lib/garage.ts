import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user and the garage they work in. For now that is their first garage;
 * a garage switcher comes with team support.
 */
export const getCurrentGarage = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: garage, error } = await supabase
    .from("garages")
    .select("id, name, plan, currency")
    .order("created_at")
    .limit(1)
    .single();
  if (error) throw new Error(`Could not load garage: ${error.message}`);

  return { supabase, user, garage };
});
