"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, secondaryButtonClass } from "@/components/ui";
import { format } from "@/lib/i18n/locales";
import { useT } from "@/lib/i18n/client";

import { deleteAccount } from "../settings-actions";

export type AccountGarage = { garage_id: string; garage_name: string; role: string; members: number; outcome: string };

/** Download everything as JSON, or delete the account after seeing what happens to each garage. */
export function AccountData({ garages }: { garages: AccountGarage[] }) {
  const a = useT().account;
  const [state, action, pending] = useActionState(deleteAccount, {} as FormState);
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const blocked = garages.some((g) => g.outcome === "blocked");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-zinc-50">{a.downloadTitle}</h3>
        <p className="text-sm text-zinc-400">{a.downloadText}</p>
        <a href="/api/export" download className={`${secondaryButtonClass} self-start`}>
          {a.download}
        </a>
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-800 pt-6">
        <h3 className="font-semibold text-zinc-50">{a.deleteTitle}</h3>
        <p className="text-sm text-zinc-400">{a.deleteText}</p>
        <ul className="flex flex-col gap-1.5 text-sm">
          {garages.map((g) => (
            <li key={g.garage_id} className={g.outcome === "blocked" ? "text-amber-300" : "text-zinc-300"}>
              <strong className="text-zinc-50">{g.garage_name}</strong> · {a.outcome[g.outcome as keyof typeof a.outcome]}
              {g.outcome === "blocked" && (
                <>
                  {" "}
                  <Link href="/dashboard/team" className="underline underline-offset-4">
                    {a.toTeam}
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={blocked}
            className={`${secondaryButtonClass} self-start border-red-400/60 text-red-300 hover:border-red-400`}
          >
            {a.deleteOpen}
          </button>
        ) : (
          <form action={action} className="flex flex-col gap-3 border border-red-400/40 p-4">
            <label className={labelClass}>
              {format(a.typeToDelete, { word: a.deleteWord })}
              <input
                name="confirm"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                autoComplete="off"
                className={`${inputClass} font-mono uppercase`}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pending || word.trim().toUpperCase() !== a.deleteWord}
                className="inline-flex min-h-11 items-center bg-red-400 px-4 text-sm font-bold text-zinc-950 disabled:opacity-50"
              >
                {pending ? a.deleting : a.deleteFinal}
              </button>
              <button type="button" onClick={() => (setOpen(false), setWord(""))} className={secondaryButtonClass}>
                {a.cancel}
              </button>
            </div>
            <FormMessage state={state} />
          </form>
        )}
      </div>
    </div>
  );
}
