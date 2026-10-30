"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { plural } from "@/lib/i18n/locales";
import { formatLapTime } from "@/lib/karting";
import { TELEMETRY_MAX_BYTES } from "@/lib/storage";
import { parseTelemetry, type ParsedTelemetry } from "@/lib/telemetry";
import { uploadTelemetryLaps } from "@/lib/telemetry-upload";

import { saveTelemetry } from "../../../telemetry-actions";

/** Reads a logger export in the browser, shows what it found, then stores the channels per lap. */
export function TelemetryImportForm({ sessionId, garageId, hasLaps }: { sessionId: string; garageId: string; hasLaps: boolean }) {
  const router = useRouter();
  const t = useT();
  const tt = t.telemetry;
  const sourceLabels: Record<string, string> = {
    aim: t.session.sourceAim,
    alfano: t.session.sourceAlfano,
    unipro: t.session.sourceUnipro,
    csv: t.session.sourceCsv,
    manual: t.session.sourceCsv,
  };
  const [parsed, setParsed] = useState<ParsedTelemetry | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();

  async function handleFile(file: File | undefined) {
    setState({});
    setParsed(null);
    if (!file) return;
    if (file.size > TELEMETRY_MAX_BYTES) {
      setState({ error: tt.tooBig });
      return;
    }
    const content = await file.text();
    if (content.slice(0, 2000).includes("\u0000")) {
      setState({ error: tt.notText });
      return;
    }
    const result = parseTelemetry(content, file.name);
    if ("error" in result) {
      setState({ error: tt.parseErrors[result.error] });
      return;
    }
    setFileName(file.name);
    setParsed(result);
  }

  function save() {
    if (!parsed) return;
    startTransition(async () => {
      const upload = await uploadTelemetryLaps(garageId, sessionId, parsed.laps);
      if ("error" in upload) {
        setState({ error: upload.error });
        return;
      }
      const result = await saveTelemetry(sessionId, {
        source: parsed.source,
        channels: parsed.channels,
        laps: parsed.laps.map((lap, i) => ({
          lap_number: lap.lap_number,
          lap_time_ms: lap.lap_time_ms,
          is_valid: lap.is_valid,
          max_speed_kmh: lap.max_speed_kmh,
          max_rpm: lap.max_rpm,
          length_m: lap.file.length_m,
          path: upload.paths[i],
        })),
      });
      setState(result);
      if (result.success) {
        setParsed(null);
        setFileName(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${secondaryButtonClass} cursor-pointer`}>
          {tt.chooseFile}
          <input
            type="file"
            accept=".csv,.txt,.tsv,text/csv,text/plain"
            className="sr-only"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <span className="min-w-0 truncate text-sm text-zinc-500">{fileName ?? tt.fileHint}</span>
      </div>

      {parsed && (
        <>
          <p className="text-sm text-zinc-300">
            {sourceLabels[parsed.source]} · {plural(parsed.laps.length, t.session.lapCount)} ·{" "}
            {parsed.channels
              .filter((c) => c !== "lat" && c !== "lng")
              .map((c) => tt.channels[c].toLowerCase())
              .join(", ")}
          </p>
          <div className="max-h-72 overflow-auto border border-zinc-800">
            <table className="w-full text-sm tabular-nums">
              <thead className="channel-label sticky top-0 bg-zinc-900 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.session.colLap}</th>
                  <th className="px-3 py-2 font-medium">{t.session.colTime}</th>
                  <th className="px-3 py-2 text-right font-medium">{tt.colLength}</th>
                  <th className="px-3 py-2 text-right font-medium">{tt.colTop}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {parsed.laps.map((lap) => (
                  <tr key={lap.lap_number} className={lap.is_valid ? "" : "text-zinc-500"}>
                    <td className="px-3 py-1.5">
                      {lap.lap_number}
                      {!lap.is_valid && <span className="ml-2 text-xs">{tt.outIn}</span>}
                    </td>
                    <td className="px-3 py-1.5">{formatLapTime(lap.lap_time_ms)}</td>
                    <td className="px-3 py-1.5 text-right">{Math.round(lap.file.length_m)} m</td>
                    <td className="px-3 py-1.5 text-right">
                      {lap.max_speed_kmh === null ? "—" : `${Math.round(lap.max_speed_kmh)} ${t.session.kmh}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="-mt-2 text-xs text-zinc-500">{hasLaps ? tt.matchExisting : tt.takeOver}</p>
        </>
      )}

      <FormMessage state={state} />
      {parsed && (
        <button type="button" onClick={save} disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? t.session.saving : plural(parsed.laps.length, tt.saveCount)}
        </button>
      )}
    </div>
  );
}
