"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/form-message";
import type { Json } from "@/lib/supabase/database.types";
import { dbErrorText } from "@/lib/db-error";
import { getCurrentGarage } from "@/lib/garage";
import { format, plural } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { validateLaps, type LapSource } from "@/lib/lap-import";
import { LOGGER_BUCKET, TELEMETRY_BUCKET } from "@/lib/storage";

import { text } from "./form-data";
import { removeFiles, removeTelemetryImports, telemetryFiles } from "./session-save";

const SOURCES: LapSource[] = ["aim", "alfano", "unipro", "csv", "manual"];

/** Replaces the session's laps with the ones the driver checked in the preview. */
export async function importLaps(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ts = (await getDictionary()).session;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text(formData, "laps_json") ?? "null");
  } catch {
    parsed = null;
  }
  const laps = validateLaps(parsed);
  if (!laps) return { error: ts.noValidLaps };

  const sourceInput = text(formData, "source");
  const source = SOURCES.find((s) => s === sourceInput) ?? "csv";

  const { supabase, garage } = await getCurrentGarage();

  // The original file was uploaded by the browser; only accept files inside this garage's folder.
  const filePath = text(formData, "file_path");
  if (filePath && !new RegExp(`^${garage.id}/[\\w-]+\\.[a-z]+$`).test(filePath)) {
    return { error: ts.fileLinkFailed };
  }

  // What the current laps leave behind once they are replaced: their telemetry and the previous import.
  const { data: current } = await supabase
    .from("sessions")
    .select("data_imports(id, file_path), events!inner(garage_id)")
    .eq("id", sessionId)
    .eq("events.garage_id", garage.id)
    .maybeSingle();
  const oldTelemetry = await telemetryFiles(supabase, [sessionId]);

  const { data: dataImport, error: importError } = await supabase
    .from("data_imports")
    .insert({
      garage_id: garage.id,
      source,
      file_path: filePath,
      file_format: filePath ? filePath.split(".").pop() : source === "manual" ? "text" : null,
      status: "parsed",
      channel_summary: {
        laps: laps.length,
        sectors: Math.max(0, ...laps.map((lap) => lap.sectors_ms.length)),
        max_speed: laps.some((lap) => lap.max_speed_kmh !== null),
        max_rpm: laps.some((lap) => lap.max_rpm !== null),
      },
    })
    .select("id")
    .single();
  if (importError) return { error: format(ts.saveFailed, { error: await dbErrorText(importError) }) };

  const { error } = await supabase.rpc("replace_session_laps", {
    p_session_id: sessionId,
    p_data_import_id: dataImport.id,
    p_laps: laps as unknown as Json,
  });
  if (error) {
    await supabase.from("data_imports").update({ status: "failed", error: error.message }).eq("id", dataImport.id);
    return { error: format(ts.lapsFailed, { error: await dbErrorText(error) }) };
  }

  await removeFiles(supabase, TELEMETRY_BUCKET, oldTelemetry);
  await removeTelemetryImports(supabase, garage.id, [sessionId]);
  const previous = current?.data_imports;
  if (previous && previous.id !== dataImport.id) {
    await supabase.from("data_imports").delete().eq("id", previous.id);
    await removeFiles(supabase, LOGGER_BUCKET, previous.file_path ? [previous.file_path] : []);
  }

  revalidatePath("/dashboard", "layout");
  return { success: plural(laps.length, ts.lapsSaved) };
}
