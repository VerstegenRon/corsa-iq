"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

import { updateProfile } from "../settings-actions";

const initialState: FormState = {};

export function ProfileForm({ displayName, garageName }: { displayName: string | null; garageName: string }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>
        {t.settings.displayName}
        <input name="display_name" defaultValue={displayName ?? ""} autoComplete="name" className={inputClass} />
      </label>
      <label className={labelClass}>
        {t.settings.garageName} *
        <input name="garage_name" required defaultValue={garageName} className={inputClass} />
        <span className="text-xs text-zinc-500">{t.settings.garageNameHelp}</span>
      </label>
      <div className="flex flex-col gap-4 sm:col-span-2">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? t.settings.saving : t.settings.save}
        </button>
      </div>
    </form>
  );
}
