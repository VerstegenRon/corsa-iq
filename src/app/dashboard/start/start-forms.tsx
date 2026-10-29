"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";

import { saveDriverStep, saveEventStep, saveKartStep, saveTeamStep } from "../onboarding-actions";

const initialState: FormState = {};
const skipClass = "text-sm text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline";

function Actions({ pending, label, skip }: { pending: boolean; label: string; skip?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Opslaan…" : label}
      </button>
      {skip && (
        <Link href={`/dashboard/start?stap=${skip}`} className={skipClass}>
          Overslaan
        </Link>
      )}
    </div>
  );
}

export function TeamStep({ garageName, displayName }: { garageName: string; displayName: string }) {
  const [state, action, pending] = useActionState(saveTeamStep, initialState);
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className={labelClass}>
        Naam van je team
        <input name="garage_name" defaultValue={garageName} required maxLength={80} placeholder="bijv. Verstegen Racing" className={inputClass} />
      </label>
      <label className={labelClass}>
        Jouw naam
        <input name="display_name" defaultValue={displayName} maxLength={80} placeholder="Zo zien je teamleden je" className={inputClass} />
      </label>
      <FormMessage state={state} />
      <Actions pending={pending} label="Volgende: de coureur" />
    </form>
  );
}

export function DriverStep({ driver }: { driver: { id: string; first_name: string; last_name: string | null; race_number: string | null } | null }) {
  const [state, action, pending] = useActionState(saveDriverStep.bind(null, driver?.id ?? null), initialState);
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Voornaam
          <input name="first_name" defaultValue={driver?.first_name ?? ""} required maxLength={60} className={inputClass} />
        </label>
        <label className={labelClass}>
          Achternaam
          <input name="last_name" defaultValue={driver?.last_name ?? ""} maxLength={60} className={inputClass} />
        </label>
      </div>
      <label className={`${labelClass} sm:w-48`}>
        Startnummer
        <input name="race_number" defaultValue={driver?.race_number ?? ""} maxLength={6} inputMode="numeric" placeholder="bijv. 27" className={`${inputClass} font-mono`} />
      </label>
      <p className="-mt-2 text-xs text-zinc-500">Rijd je niet zelf, maar bijvoorbeeld je zoon of dochter? Vul dan de naam van de coureur in. Meer coureurs voeg je later toe.</p>
      <FormMessage state={state} />
      <Actions pending={pending} label="Volgende: de kart" skip={3} />
    </form>
  );
}

const CLASSES = ["Mini", "OK-J", "OK", "X30 Junior", "X30 Senior", "KZ2", "Rotax Max", "Rotax DD2"];

export function KartStep() {
  const [state, action, pending] = useActionState(saveKartStep, initialState);
  const [kartClass, setKartClass] = useState("");
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className={labelClass}>
        Naam van de kart
        <input name="name" defaultValue="Kart A" required maxLength={60} className={inputClass} />
      </label>
      <fieldset>
        <legend className="channel-label mb-2">Klasse</legend>
        <div className="flex flex-wrap gap-1">
          {CLASSES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setKartClass(c)}
              aria-pressed={kartClass === c}
              className={`inline-flex min-h-11 items-center border px-3 text-sm ${
                kartClass === c ? "border-brand-400 bg-brand-500 font-bold text-on-brand" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input name="class" value={kartClass} onChange={(e) => setKartClass(e.target.value)} placeholder="of typ een andere klasse" maxLength={40} className={`${inputClass} mt-2`} />
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Chassis (merk)
          <input name="chassis_brand" maxLength={60} placeholder="bijv. Tony Kart" className={inputClass} />
        </label>
        <label className={labelClass}>
          Bouwjaar
          <input name="chassis_year" inputMode="numeric" maxLength={4} placeholder="bijv. 2025" className={`${inputClass} font-mono`} />
        </label>
      </div>
      <FormMessage state={state} />
      <Actions pending={pending} label="Volgende: het eerste evenement" skip={4} />
    </form>
  );
}

export function EventStep({ tracks, defaultDate }: { tracks: { id: string; label: string }[]; defaultDate: string }) {
  const [state, action, pending] = useActionState(saveEventStep, initialState);
  const [type, setType] = useState("training");
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className={labelClass}>
        Circuit
        <select name="track_id" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Kies het circuit
          </option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <label className={labelClass}>
          Datum
          <input name="starts_on" type="date" defaultValue={defaultDate} required className={inputClass} />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm text-zinc-300">Soort</legend>
          <div className="flex flex-wrap gap-1">
            {[
              ["training", "Training"],
              ["race", "Race"],
              ["test", "Test"],
            ].map(([value, name]) => (
              <label
                key={value}
                className={`inline-flex min-h-12 cursor-pointer items-center border px-4 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-400 ${
                  type === value ? "border-brand-400 bg-brand-500 font-bold text-on-brand" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="sr-only" />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <label className={labelClass}>
        Naam (optioneel)
        <input name="name" maxLength={80} placeholder="Leeg laten geeft bijv. “Training Karting Genk”" className={inputClass} />
      </label>
      <p className="-mt-2 text-xs text-zinc-500">Staat jouw baan er niet tussen? Sla deze stap over en voeg het circuit toe onder Meer → Circuits.</p>
      <FormMessage state={state} />
      <Actions pending={pending} label="Evenement opslaan" skip={5} />
    </form>
  );
}
