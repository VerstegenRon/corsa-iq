import type { Metadata } from "next";
import Link from "next/link";

import { cardClass, linkClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/team";

import { AcceptButton } from "./accept-button";

export const metadata: Metadata = {
  title: "Uitnodiging — CorsaIQ",
  robots: { index: false },
};

const STATUS_TEXT: Record<string, string> = {
  used: "Deze uitnodiging is al gebruikt. Vraag de eigenaar van het team om een nieuwe link.",
  expired: "Deze uitnodiging is verlopen. Vraag de eigenaar van het team om een nieuwe link.",
  revoked: "Deze uitnodiging is ingetrokken.",
};

/** Opened from an invitation link: sign in or create an account, then join the team. */
export default async function InvitePage({ params }: PageProps<"/uitnodiging/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const here = `/uitnodiging/${token}`;

  let body: React.ReactNode;
  if (!user) {
    body = (
      <>
        <p className="text-zinc-300">Je bent uitgenodigd voor een team in CorsaIQ. Log in of maak een account aan; daarna kom je hier terug om lid te worden.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/login?next=${encodeURIComponent(here)}`} className={primaryButtonClass}>
            Inloggen of account maken
          </Link>
        </div>
      </>
    );
  } else {
    const { data } = await supabase.rpc("garage_invite_info", { p_token: token });
    const invite = data?.[0];
    if (!invite) {
      body = <p className="text-zinc-300">Deze uitnodiging bestaat niet. Controleer of je de hele link hebt gekopieerd.</p>;
    } else if (invite.status !== "open") {
      body = (
        <>
          <p className="text-zinc-300">{STATUS_TEXT[invite.status]}</p>
          <Link href="/dashboard" className={`${secondaryButtonClass} mt-6`}>
            Naar CorsaIQ
          </Link>
        </>
      );
    } else {
      const role = ROLE_LABELS[invite.role];
      body = (
        <>
          <p className="text-zinc-300">
            Je bent uitgenodigd voor <strong className="text-zinc-50">{invite.garage_name}</strong> als <strong className="text-zinc-50">{role?.name.toLowerCase()}</strong>.
          </p>
          <p className="mt-2 text-sm text-zinc-400">{role?.text}</p>
          <p className="mt-2 text-sm text-zinc-500">Je bent ingelogd als {user.email}.</p>
          <AcceptButton token={token} />
        </>
      );
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="mx-auto flex w-full max-w-6xl items-center px-4 py-6 sm:px-6">
        <Link href="/" className={`font-display text-lg font-black tracking-tight uppercase ${linkClass} text-zinc-50 no-underline`}>
          Corsa<span className="text-brand-400">/</span>IQ
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 pb-24 sm:px-6">
        <section className={cardClass}>
          <p className="channel-label mb-2">Uitnodiging</p>
          <h1 className="mb-5 text-3xl">
            Welkom in het team<span className="text-brand-400">.</span>
          </h1>
          {body}
        </section>
      </main>
    </div>
  );
}
