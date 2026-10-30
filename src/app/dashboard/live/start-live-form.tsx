"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

import { startLive } from "../live-actions";

export type StartOption = { id: string; label: string };
export type StartEvent = StartOption & { trackId: string };
export type ReferenceOption = { lapId: number; label: string };

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export function StartLiveForm({
  events,
  karts,
  drivers,
  kartDrivers,
  types,
  defaultType,
  references,
}: {
  events: StartEvent[];
  karts: StartOption[];
  drivers: StartOption[];
  /** The usual driver of each kart, from its latest session. */
  kartDrivers: Record<string, string>;
  types: [string, string][];
  defaultType: string;
  /** Fastest laps per circuit, fastest first. */
  references: Record<string, ReferenceOption[]>;
}) {
  const tl = useT().raceDay.live;
  const router = useRouter();
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [kartId, setKartId] = useState(karts[0]?.id ?? "");
  const [driverId, setDriverId] = useState(kartDrivers[karts[0]?.id ?? ""] ?? drivers[0]?.id ?? "");
  const [type, setType] = useState(defaultType);
  const [planned, setPlanned] = useState("");
  const trackId = events.find((e) => e.id === eventId)?.trackId ?? "";
  const refs = references[trackId] ?? [];
  const [refChoice, setRefChoice] = useState<string | null>(null);
  const referenceLapId = refChoice === null ? (refs[0]?.lapId ?? null) : refChoice === "" ? null : Number(refChoice);
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();

  function start() {
    const plannedLaps = planned.trim() === "" ? null : Number(planned);
    startTransition(async () => {
      const result = await startLive({ eventId, kartId, driverId, type, plannedLaps, referenceLapId });
      if (result.id) router.push(`/dashboard/live?id=${result.id}`);
      setState(result.id && !result.error ? {} : result);
    });
  }

  return (
    <form action={start} className="flex flex-col gap-5">
      <label className={labelClass}>
        {tl.event}
        <select value={eventId} onChange={(e) => (setEventId(e.target.value), setRefChoice(null))} className={inputClass}>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {tl.kart}
          <select
            value={kartId}
            onChange={(e) => {
              setKartId(e.target.value);
              if (kartDrivers[e.target.value]) setDriverId(kartDrivers[e.target.value]);
            }}
            className={inputClass}
          >
            {karts.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {tl.driver}
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={inputClass}>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="channel-label mb-2">{tl.session}</legend>
        <div className="flex flex-wrap gap-1">
          {types.map(([value, name]) => (
            <label
              key={value}
              className={`inline-flex min-h-11 cursor-pointer items-center border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-400 ${
                value === type ? "border-brand-400 bg-brand-500 font-bold text-on-brand" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <input type="radio" name="type" value={value} checked={value === type} onChange={() => setType(value)} className="sr-only" />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <label className={labelClass}>
          {tl.plannedLaps}
          <input value={planned} onChange={(e) => setPlanned(e.target.value)} inputMode="numeric" placeholder={tl.plannedPlaceholder} className={`${inputClass} font-mono`} />
        </label>
        <label className={labelClass}>
          {tl.reference}
          <select value={referenceLapId === null ? "" : String(referenceLapId)} onChange={(e) => setRefChoice(e.target.value)} className={inputClass}>
            {refs.map((r) => (
              <option key={r.lapId} value={r.lapId}>
                {r.label}
              </option>
            ))}
            <option value="">{tl.noReference}</option>
          </select>
        </label>
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={isPending || !eventId || !kartId || !driverId} className={`${primaryButtonClass} ${focusRing} self-start`}>
        {isPending ? tl.starting : tl.start}
      </button>
    </form>
  );
}
