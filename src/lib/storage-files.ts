// Listing the files of a garage across folders. Storage lists one folder at a time; telemetry is
// stored per session, so this walks into subfolders (a folder is an entry without an id).

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export async function listFiles(supabase: SupabaseClient<Database>, bucket: string, prefix: string): Promise<string[]> {
  const names: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      if (item.id === null) names.push(...(await listFiles(supabase, bucket, path)));
      else names.push(path);
    }
    if (!data || data.length < 1000) return names;
  }
}
