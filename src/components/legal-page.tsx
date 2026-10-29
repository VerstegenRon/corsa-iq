import Link from "next/link";

/** The frame of the privacy statement and the terms: title, version, language switch, sections. */
export function LegalPage({
  title,
  version,
  switchTo,
  draftNotice,
  children,
}: {
  title: string;
  version: string;
  switchTo: { href: string; label: string };
  draftNotice?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
        <Link href="/" className="font-display text-lg font-black tracking-tight uppercase">
          Corsa<span className="text-brand-400">/</span>IQ
        </Link>
        <Link href={switchTo.href} className="text-sm text-brand-300 underline-offset-4 hover:underline">
          {switchTo.label}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 sm:px-6">
        <h1 className="text-3xl sm:text-4xl">
          {title}
          <span className="text-brand-400">.</span>
        </h1>
        <p className="channel-label mt-2">{version}</p>
        {draftNotice && <p className="mt-4 border border-amber-400/50 px-4 py-3 text-sm text-amber-200">{draftNotice}</p>}
        <div className="legal mt-8 flex flex-col gap-8 text-[15px] leading-relaxed text-zinc-300 [&_h2]:mb-2 [&_h2]:font-sans [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-normal [&_h2]:text-zinc-50 [&_h2]:normal-case [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2 [&_ul+p]:mt-3 [&_strong]:text-zinc-50 [&_ul]:mt-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
          {children}
        </div>
      </main>
    </div>
  );
}
