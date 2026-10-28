"use client";

import { useActionState } from "react";

import { authenticate, type AuthState } from "./actions";

const initialState: AuthState = {};

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-zinc-50 placeholder:text-zinc-600 focus-visible:border-cyan-400/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(authenticate, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm text-zinc-300">
        E-mailadres
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
        Wachtwoord
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
        <p role="status" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          name="intent"
          value="signin"
          disabled={isPending}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-cyan-400 px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-60"
        >
          Inloggen
        </button>
        <button
          type="submit"
          name="intent"
          value="signup"
          disabled={isPending}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-semibold text-zinc-100 transition-colors hover:border-cyan-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-60"
        >
          Account aanmaken
        </button>
      </div>
    </form>
  );
}
