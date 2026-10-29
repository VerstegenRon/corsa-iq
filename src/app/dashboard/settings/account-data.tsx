"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, secondaryButtonClass } from "@/components/ui";
import { DELETE_WORD } from "@/lib/account";

import { deleteAccount } from "../settings-actions";

export type AccountGarage = { garage_id: string; garage_name: string; role: string; members: number; outcome: string };

const OUTCOME_TEXT: Record<string, string> = {
  deleted: "wordt verwijderd met alle gegevens en bestanden (je bent het enige lid)",
  left: "je verlaat dit team; je invoer blijft bij het team, zonder je naam",
  blocked: "blokkeert: je bent de enige eigenaar naast andere leden. Maak eerst iemand anders eigenaar.",
};

/** Download everything as JSON, or delete the account after seeing what happens to each garage. */
export function AccountData({ garages }: { garages: AccountGarage[] }) {
  const [state, action, pending] = useActionState(deleteAccount, {} as FormState);
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const blocked = garages.some((g) => g.outcome === "blocked");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-zinc-50">Je gegevens downloaden</h3>
        <p className="text-sm text-zinc-400">
          Eén JSON-bestand met je account, je teams en alles wat je in deze garage kunt zien: coureurs, karts, onderdelen, evenementen, sessies, ronden,
          setups en lijsten. Geüploade bestanden staan erin op naam.
        </p>
        <a href="/api/export" download className={`${secondaryButtonClass} self-start`}>
          Download je gegevens
        </a>
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-800 pt-6">
        <h3 className="font-semibold text-zinc-50">Account verwijderen</h3>
        <p className="text-sm text-zinc-400">Dit kan niet ongedaan worden gemaakt. Download eerst je gegevens als je ze wilt bewaren. Dit gebeurt er met je teams:</p>
        <ul className="flex flex-col gap-1.5 text-sm">
          {garages.map((g) => (
            <li key={g.garage_id} className={g.outcome === "blocked" ? "text-amber-300" : "text-zinc-300"}>
              <strong className="text-zinc-50">{g.garage_name}</strong> · {OUTCOME_TEXT[g.outcome]}
              {g.outcome === "blocked" && (
                <>
                  {" "}
                  <Link href="/dashboard/team" className="underline underline-offset-4">
                    Naar Team
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>

        {!open ? (
          <button type="button" onClick={() => setOpen(true)} disabled={blocked} className={`${secondaryButtonClass} self-start border-red-400/60 text-red-300 hover:border-red-400`}>
            Account verwijderen…
          </button>
        ) : (
          <form action={action} className="flex flex-col gap-3 border border-red-400/40 p-4">
            <label className={labelClass}>
              Typ {DELETE_WORD} om je account definitief te verwijderen
              <input name="confirm" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" className={`${inputClass} font-mono uppercase`} />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pending || word.trim().toUpperCase() !== DELETE_WORD}
                className="inline-flex min-h-11 items-center bg-red-400 px-4 text-sm font-bold text-zinc-950 disabled:opacity-50"
              >
                {pending ? "Verwijderen…" : "Definitief verwijderen"}
              </button>
              <button type="button" onClick={() => (setOpen(false), setWord(""))} className={secondaryButtonClass}>
                Annuleren
              </button>
            </div>
            <FormMessage state={state} />
          </form>
        )}
      </div>
    </div>
  );
}
