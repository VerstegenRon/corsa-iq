"use client";

import Link from "next/link";
import { useActionState } from "react";

import { useT } from "@/lib/i18n/client";

import { requestPasswordReset, type AuthState } from "../login/actions";

const initialState: AuthState = {};

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-zinc-50 placeholder:text-zinc-600 focus-visible:border-brand-400/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export function ResetRequestForm() {
  const t = useT();
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        {t.login.email}
        <input name="email" type="email" autoComplete="email" defaultValue={state.email} required className={inputClass} />
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center rounded-full bg-brand-500 px-6 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:opacity-60"
      >
        {t.login.resetSend}
      </button>
      <Link href="/login" className="text-center text-sm text-brand-300 underline-offset-4 hover:underline">
        {t.login.backToLogin}
      </Link>
    </form>
  );
}
