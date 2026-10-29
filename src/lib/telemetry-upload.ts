// Uploads one resampled channel file per lap to the private "telemetry" bucket, under
// "<garage_id>/<session_id>/", which the storage policies check.

import { createClient } from "@/lib/supabase/client";

import { TELEMETRY_BUCKET } from "@/lib/storage";
import type { TelemetryLap } from "@/lib/telemetry";

export async function uploadTelemetryLaps(
  garageId: string,
  sessionId: string,
  laps: TelemetryLap[],
): Promise<{ paths: string[] } | { error: string }> {
  const storage = createClient().storage.from(TELEMETRY_BUCKET);
  const batch = crypto.randomUUID().slice(0, 8);
  const paths: string[] = [];
  for (const lap of laps) {
    const path = `${garageId}/${sessionId}/${batch}-lap-${lap.lap_number}.json`;
    const body = new Blob([JSON.stringify(lap.file)], { type: "application/json" });
    const { error } = await storage.upload(path, body, { contentType: "application/json", upsert: true });
    if (error) {
      if (paths.length > 0) await storage.remove(paths);
      return { error: `Telemetrie uploaden mislukt: ${error.message}` };
    }
    paths.push(path);
  }
  return { paths };
}
