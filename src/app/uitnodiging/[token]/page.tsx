import type { Metadata } from "next";
import Link from "next/link";

import { cardClass, linkClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";

import { AcceptButton } from "./accept-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).invite.metaTitle, robots: { index: false } };
}

/** Opened from an invitation link: sign in or create an account, then join the team. */
export default async function InvitePage({ params }: PageProps<"/uitnodiging/[token]">) {
  const { token } = await params;
  const t = await getDictionary();
  const ti = t.invite;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const here = `/uitnodiging/${token}`;

  let body: React.ReactNode;
  if (!user) {
    body = (
      <>
        <p className="text-zinc-300">{ti.signIn}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/login?next=${encodeURIComponent(here)}`} className={primaryButtonClass}>
            {ti.signInButton}
          </Link>
        </div>
      </>
    );
  } else {
    const { data } = await supabase.rpc("garage_invite_info", { p_token: token });
    const invite = data?.[0];
    if (!invite) {
      body = <p className="text-zinc-300">{ti.notFound}</p>;
    } else if (invite.status !== "open") {
      body = (
        <>
          <p className="text-zinc-300">{ti[invite.status as "used" | "expired" | "revoked"]}</p>
          <Link href="/dashboard" className={`${secondaryButtonClass} mt-6`}>
            {ti.toApp}
          </Link>
        </>
      );
    } else {
      const role = t.roles[invite.role as keyof typeof t.roles];
      const [before, between, after] = ti.invitedTo.split(/{garage}|{role}/);
      body = (
        <>
          <p className="text-zinc-300">
            {before}
            <strong className="text-zinc-50">{invite.garage_name}</strong>
            {between}
            <strong className="text-zinc-50">{role?.name.toLowerCase()}</strong>
            {after}
          </p>
          <p className="mt-2 text-sm text-zinc-400">{role?.text}</p>
          <p className="mt-2 text-sm text-zinc-500">{format(ti.signedInAs, { email: user.email ?? "" })}</p>
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
          <p className="channel-label mb-2">{ti.eyebrow}</p>
          <h1 className="mb-5 text-3xl">
            {ti.title}
            <span className="text-brand-400">.</span>
          </h1>
          {body}
        </section>
      </main>
    </div>
  );
}
