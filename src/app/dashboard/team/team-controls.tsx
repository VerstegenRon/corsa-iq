"use client";

import { useState, useTransition } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/locales";

import { changeRole, createInvite, switchGarage } from "../team-actions";

/** A role and a name, then a link to send. The link works once, for seven days. */
export function InviteForm({ origin }: { origin: string }) {
  const t = useT();
  const tt = t.team;
  const [role, setRole] = useState("mechanic");
  const [label, setLabel] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const result = await createInvite(role, label);
      setState(result.error ? result : {});
      if (result.token) {
        setLink(`${origin}/uitnodiging/${result.token}`);
        setCopied(false);
      }
    });
  }

  const message = link ? format(tt.inviteMessage, { role: t.roles[role as keyof typeof t.roles].name.toLowerCase(), link }) : "";

  return (
    <div className="flex flex-col gap-5">
      <form action={create} className="flex flex-col gap-4">
        <fieldset>
          <legend className="channel-label mb-2">{tt.role}</legend>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {(["mechanic", "driver", "viewer", "owner"] as const).map((key) => (
              <label
                key={key}
                className={`flex min-h-14 cursor-pointer flex-col justify-center border px-4 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-400 ${
                  role === key ? "border-brand-400 bg-brand-500 text-on-brand" : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <input type="radio" name="role" value={key} checked={role === key} onChange={() => setRole(key)} className="sr-only" />
                <span className="font-semibold">{t.roles[key].name}</span>
                <span className={`text-xs ${role === key ? "opacity-80" : "text-zinc-400"}`}>{t.roles[key].text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className={labelClass}>
          {tt.forWhom}
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder={tt.forWhomPlaceholder} className={inputClass} />
        </label>
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? tt.creating : tt.createLink}
        </button>
        <FormMessage state={state} />
      </form>

      {link && (
        <div className="border border-brand-400 px-4 py-4">
          <p className="channel-label">{tt.sendLink}</p>
          <p className="mt-2 font-mono text-sm break-all text-zinc-50">{link}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className={secondaryButtonClass}
            >
              {copied ? tt.copied : tt.copy}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>
              {tt.viaWhatsapp}
            </a>
            <a href={`mailto:?subject=${encodeURIComponent(tt.inviteSubject)}&body=${encodeURIComponent(message)}`} className={secondaryButtonClass}>
              {tt.viaEmail}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function RoleSelect({ userId, role, name }: { userId: string; role: string; name: string }) {
  const t = useT();
  const [value, setValue] = useState(role);
  const [state, setState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  return (
    <span className="flex flex-col items-end gap-1">
      <select
        aria-label={format(t.team.roleOf, { name })}
        value={value}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          const previous = value;
          setValue(next);
          startTransition(async () => {
            const result = await changeRole(userId, next);
            if (result.error) setValue(previous);
            setState(result.error ? result : {});
          });
        }}
        className={`${inputClass} h-11 w-36`}
      >
        {Object.entries(t.roles).map(([key, r]) => (
          <option key={key} value={key}>
            {r.name}
          </option>
        ))}
      </select>
      {state.error && (
        <span role="alert" className="max-w-56 text-right text-xs text-red-300">
          {state.error}
        </span>
      )}
    </span>
  );
}

export function GarageSwitch({ garages, currentId }: { garages: { id: string; name: string; role: string }[]; currentId: string }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  return (
    <ul className="flex flex-col gap-1">
      {garages.map((g) => (
        <li key={g.id}>
          <button
            type="button"
            disabled={isPending || g.id === currentId}
            onClick={() => startTransition(() => switchGarage(g.id))}
            aria-current={g.id === currentId ? "true" : undefined}
            className={`flex min-h-12 w-full items-center justify-between gap-3 border px-4 text-left ${
              g.id === currentId ? "border-brand-400 text-zinc-50" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
            }`}
          >
            <span className="truncate font-semibold">{g.name}</span>
            <span className="shrink-0 text-xs text-zinc-400">
              {g.id === currentId ? `${t.team.active} · ` : ""}
              {t.roles[g.role as keyof typeof t.roles]?.name}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
