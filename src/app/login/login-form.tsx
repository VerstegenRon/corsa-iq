"use client";

import { useActionState } from "react";

import { useT } from "@/lib/i18n/client";

import { authenticate, type AuthState } from "./actions";

const initialState: AuthState = {};

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-zinc-50 placeholder:text-zinc-600 focus-visible:border-brand-400/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

/** `next`: where to go after signing in, such as an invitation. */
export function LoginForm({ next }: { next?: string }) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(authenticate, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        {t.login.email}
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        {t.login.password}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          name="intent"
          value="signin"
          disabled={isPending}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-500 px-6 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:opacity-60"
        >
          {t.login.signIn}
        </button>
        <button
          type="submit"
          name="intent"
          value="signup"
          disabled={isPending}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-semibold text-zinc-100 transition-colors hover:border-brand-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:opacity-60"
        >
          {t.login.signUp}
        </button>
      </div>
    </form>
  );
}
