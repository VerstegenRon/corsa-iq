import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Inloggen — CorsaIQ",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, confirmed } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="mx-auto flex w-full max-w-6xl items-center px-6 py-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-[0.2em] text-cyan-300 uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          CorsaIQ
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-24">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Welkom in de pitbox</h1>
          <p className="mt-2 mb-8 text-sm text-zinc-400">
            Log in, of maak een account aan om je kart en seizoen bij te houden.
          </p>
          {confirmed === "1" && (
            <p role="status" className="mb-5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
              Je e-mailadres is bevestigd. Log nu in met je wachtwoord.
            </p>
          )}
          {error === "confirm" && (
            <p role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              De bevestigingslink is verlopen of ongeldig. Log in of vraag een nieuwe link aan.
            </p>
          )}
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
