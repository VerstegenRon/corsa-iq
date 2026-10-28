// Keeps the original logger export in the private "logger-files" bucket under "<garage_id>/",
// so it can be parsed again when import support improves.

import { createClient } from "@/lib/supabase/client";

import { LOGGER_BUCKET } from "@/lib/storage";

export async function uploadLoggerFile(garageId: string, file: File): Promise<{ path: string } | { error: string }> {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z]/g, "") || "csv";
  const path = `${garageId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await createClient()
    .storage.from(LOGGER_BUCKET)
    .upload(path, file, { contentType: file.type || "text/csv" });
  if (error) return { error: `Bestand uploaden mislukt: ${error.message}` };
  return { path };
}
