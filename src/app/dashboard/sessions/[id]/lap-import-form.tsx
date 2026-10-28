"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { formatLapTime } from "@/lib/karting";
import {
  buildLaps,
  detectSource,
  guessMapping,
  parseLapTable,
  type ColumnMapping,
  type LapSource,
} from "@/lib/lap-import";
import { uploadLoggerFile } from "@/lib/logger-upload";

import { importLaps } from "../../lap-actions";

const initialState: FormState = {};
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const SOURCE_LABELS: Record<LapSource, string> = {
  aim: "AiM / MyChron-export",
  alfano: "Alfano-export",
  unipro: "Unipro-export",
  csv: "CSV-bestand",
  manual: "Geplakte tijden",
};

export function LapImportForm({
  sessionId,
  garageId,
  hasLaps,
}: {
  sessionId: string;
  garageId: string;
  hasLaps: boolean;
}) {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const [mappingOverride, setMappingOverride] = useState<Partial<ColumnMapping>>({});
  const [excluded, setExcluded] = useState<Record<number, boolean>>({});

  const table = useMemo(() => (input.trim() ? parseLapTable(input) : null), [input]);
  const guessed = useMemo(() => (table ? guessMapping(table) : null), [table]);
  const mapping = useMemo(() => (guessed ? { ...guessed, ...mappingOverride } : null), [guessed, mappingOverride]);
  const laps = useMemo(() => (table && mapping ? buildLaps(table, mapping) : []), [table, mapping]);
  const finalLaps = laps.map((lap) => ({
    ...lap,
    is_valid: excluded[lap.lap_number] === undefined ? lap.is_valid : !excluded[lap.lap_number],
  }));
  const source = detectSource(input, fileName ?? undefined);
  const sectorCount = Math.max(0, ...laps.map((lap) => lap.sectors_ms.length));

  function reset(nextInput: string, nextFile: File | null) {
    setInput(nextInput);
    fileRef.current = nextFile;
    setFileName(nextFile?.name ?? null);
    setMappingOverride({});
    setExcluded({});
  }

  async function handleFile(file: File | undefined) {
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Dit bestand is groter dan 5 MB. Exporteer alleen de rondetijden als CSV.");
      return;
    }
    const content = await file.text();
    // Binary logger files (.xrk, .drk) are not text; those need a CSV export from the logger software.
    if (content.slice(0, 2000).includes("\u0000")) {
      setFileError("Dit is geen tekstbestand. Exporteer de rondetijden als CSV vanuit je loggersoftware.");
      return;
    }
    reset(content, file);
  }

  const [state, formAction, isPending] = useActionState(async (prev: FormState, formData: FormData) => {
    const file = fileRef.current;
    if (file) {
      const upload = await uploadLoggerFile(garageId, file);
      if ("error" in upload) return { error: upload.error };
      formData.set("file_path", upload.path);
    }
    const result = await importLaps(sessionId, prev, formData);
    if (result.success) reset("", null);
    return result;
  }, initialState);

  const columnOptions = table?.headers.map((header, index) => ({ index, label: header })) ?? [];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${secondaryButtonClass} cursor-pointer`}>
          Bestand kiezen
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
        <span className="text-sm text-zinc-500">{fileName ?? "of plak hieronder je rondetijden, één per regel"}</span>
      </div>
      {fileError && (
        <p role="alert" className="text-sm text-red-300">
          {fileError}
        </p>
      )}

      <label className={labelClass}>
        Rondetijden
        <textarea
          value={input}
          onChange={(event) => reset(event.target.value, null)}
          rows={input ? 4 : 6}
          spellCheck={false}
          placeholder={"52.345\n51.987\n1:02.401"}
          className={`${inputClass} h-auto py-3 font-mono`}
        />
      </label>

      {table && mapping && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              Kolom rondetijd
              <select
                value={mapping.lapTime}
                onChange={(event) => setMappingOverride((m) => ({ ...m, lapTime: Number(event.target.value) }))}
                className={inputClass}
              >
                {columnOptions.map((column) => (
                  <option key={column.index} value={column.index}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Kolom rondenummer
              <select
                value={mapping.lapNumber ?? ""}
                onChange={(event) =>
                  setMappingOverride((m) => ({
                    ...m,
                    lapNumber: event.target.value === "" ? null : Number(event.target.value),
                  }))
                }
                className={inputClass}
              >
                <option value="">Doortellen vanaf 1</option>
                {columnOptions.map((column) => (
                  <option key={column.index} value={column.index}>
                    {column.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-sm text-zinc-400 sm:pt-7">
              <p>{SOURCE_LABELS[source]}</p>
              <p className="text-xs text-zinc-500">
                {laps.length} {laps.length === 1 ? "ronde" : "ronden"}
                {sectorCount > 0 && ` · ${sectorCount} sectoren`}
                {laps.some((lap) => lap.max_speed_kmh !== null) && " · topsnelheid"}
                {laps.some((lap) => lap.max_rpm !== null) && " · toerental"}
              </p>
            </div>
          </div>

          {laps.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Geen rondetijden gevonden in deze kolom. Kies een andere kolom, of schrijf tijden als 52.345 of 1:02.345.
            </p>
          ) : (
            <div className="max-h-96 overflow-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm tabular-nums">
                <thead className="sticky top-0 bg-zinc-900 text-left text-xs text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Ronde</th>
                    <th className="px-3 py-2 font-medium">Tijd</th>
                    {Array.from({ length: sectorCount }, (_, i) => (
                      <th key={i} className="px-3 py-2 font-medium">
                        S{i + 1}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-medium">Telt mee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {finalLaps.map((lap) => (
                    <tr key={lap.lap_number} className={lap.is_valid ? "" : "text-zinc-500"}>
                      <td className="px-3 py-1.5">{lap.lap_number}</td>
                      <td className="px-3 py-1.5">{formatLapTime(lap.lap_time_ms)}</td>
                      {Array.from({ length: sectorCount }, (_, i) => (
                        <td key={i} className="px-3 py-1.5">
                          {lap.sectors_ms[i] === undefined ? "—" : formatLapTime(lap.sectors_ms[i])}
                        </td>
                      ))}
                      <td className="px-3 py-1.5">
                        <input
                          type="checkbox"
                          checked={lap.is_valid}
                          aria-label={`Ronde ${lap.lap_number} telt mee`}
                          onChange={(event) => setExcluded((e) => ({ ...e, [lap.lap_number]: !event.target.checked }))}
                          className="size-4 accent-brand-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="-mt-3 text-xs text-zinc-500">
            Uit- en inrondes en rondes die veel trager zijn dan normaal tellen niet mee voor snelste ronde en gemiddelde.
            Vink aan of uit wat klopt.
          </p>
        </>
      )}

      <input type="hidden" name="laps_json" value={JSON.stringify(finalLaps)} />
      <input type="hidden" name="source" value={source} />

      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <button
          type="submit"
          disabled={isPending || finalLaps.length === 0}
          className={`${primaryButtonClass} self-start`}
        >
          {isPending
            ? "Opslaan…"
            : finalLaps.length === 0
              ? "Ronden opslaan"
              : `${finalLaps.length} ${finalLaps.length === 1 ? "ronde" : "ronden"} opslaan${hasLaps ? " (vervangt huidige)" : ""}`}
        </button>
      </div>
    </form>
  );
}
