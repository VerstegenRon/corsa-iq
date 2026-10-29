"use client";

import { useActionState } from "react";

import { useT } from "@/lib/i18n/client";

import { setNewPassword, type AuthState } from "../login/actions";

const initialState: AuthState = {};

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-zinc-50 placeholder:text-zinc-600 focus-visible:border-brand-400/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export function NewPasswordForm({ email }: { email: string }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(setNewPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* For password managers: which account this password belongs to. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        {t.login.newPassword}
        <input name="password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
      </label>
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        {t.login.repeatPassword}
        <input name="password_repeat" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center rounded-full bg-brand-500 px-6 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:opacity-60"
      >
        {t.login.newPasswordSave}
      </button>
    </form>
  );
}
