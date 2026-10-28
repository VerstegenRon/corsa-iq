import Link from "next/link";

const features = [
  {
    title: "Realtime inzicht",
    description:
      "Zie in één overzicht wat er speelt: signalen, prioriteiten en de volgende beste actie — zonder spreadsheet-chaos.",
  },
  {
    title: "Scherpe beslissingen",
    description:
      "CorsaIQ koppelt context aan data, zodat teams sneller kiezen wat écht telt in plaats van te gokken op onderbuikgevoel.",
  },
  {
    title: "Klaar voor schaal",
    description:
      "Van first scan tot dagelijkse ritme: dezelfde heldere interface, gebouwd om mee te groeien met jouw operatie.",
  },
] as const;

export default function Home() {
  return (
    <div className="relative isolate flex min-h-full flex-col overflow-hidden bg-zinc-950 text-zinc-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.12),_transparent_55%)]"
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <p className="text-sm font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          CorsaIQ
        </p>
        <Link
          href="#cta"
          className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-cyan-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          Demo aanvragen
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 pb-20">
        <section className="flex flex-col items-start gap-8 pt-16 pb-24 sm:pt-24">
          <p className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200 uppercase">
            Operationele intelligentie
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Beslissingen met de scherpte van een dashboard, niet de ruis van tien tools.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-400 text-pretty">
            CorsaIQ helpt teams om data, context en actie in één strak ritme te
            brengen. Minder zoeken. Meer vooruit.
          </p>
          <Link
            href="#cta"
            className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-400 px-8 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Start met CorsaIQ
          </Link>
        </section>

        <section id="features" aria-labelledby="features-heading" className="scroll-mt-8">
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="cta"
          aria-labelledby="cta-heading"
          className="mt-20 flex flex-col items-start gap-5 rounded-3xl border border-zinc-800 bg-zinc-900/40 px-8 py-12 scroll-mt-8"
        >
          <h2 id="cta-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Klaar om scherper te werken?
          </h2>
          <p className="max-w-lg text-zinc-400">
            Plan een korte walkthrough. Geen slides-overkill — alleen hoe CorsaIQ
            in jouw workflow past.
          </p>
          <Link
            href="mailto:hello@corsa-iq.com"
            className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-400 px-8 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Vraag een demo aan
          </Link>
        </section>
      </main>
    </div>
  );
}
