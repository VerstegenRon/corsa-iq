"use client";

import { useActionState } from "react";

import { FormMessage, type FormState } from "@/components/form-message";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

import { changePassword } from "../settings-actions";

const initialState: FormState = {};

export function PasswordForm() {
  const t = useT();
  const [state, formAction, isPending] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>
        {t.settings.newPassword}
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </label>
      <label className={labelClass}>
        {t.settings.repeatPassword}
        <input name="password_repeat" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </label>
      <div className="flex flex-col gap-4 sm:col-span-2">
        <FormMessage state={state} />
        <button type="submit" disabled={isPending} className={`${primaryButtonClass} self-start`}>
          {isPending ? t.settings.saving : t.settings.changePassword}
        </button>
      </div>
    </form>
  );
}
