import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { LapTimeChart, type LapPoint } from "@/components/lap-time-chart";
import { cardClass, primaryButtonClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/locales";
import { formatLapTime } from "@/lib/karting";
import { formatDelta } from "@/lib/lap-analysis";
import { createClient } from "@/lib/supabase/server";

// Everything shown in the example cards is made up; the cards say so (badge and label).

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.home.metaTitle, description: t.home.metaDescription };
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";
const ghostButtonClass = `inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-medium text-zinc-200 transition-colors hover:border-cyan-400/40 hover:text-white ${focusRing}`;

const LOGGERS = ["AiM / MyChron", "Alfano", "Unipro"];

/** Fastest lap per event at one track over a season (made up). */
const PROGRESS = [
  { date: "2026-04-12", ms: 48214 },
  { date: "2026-05-24", ms: 48051 },
  { date: "2026-06-21", ms: 47930 },
  { date: "2026-08-09", ms: 47988 },
  { date: "2026-09-13", ms: 47861 },
  { date: "2026-10-11", ms: 47802 },
];

/** One qualifying session (made up); the out-lap is left out like the app does. */
const SESSION_LAPS = [48412, 48105, 47961, 47802, 47890, 48033, 47915];

/** Engine components with run time since their last job and a limit, in minutes (made up). */
const COMPONENTS = [
  { key: "piston", minutes: 550, limit: 600 },
  { key: "big_end", minutes: 550, limit: 1200 },
  { key: "clutch", minutes: 380, limit: 900 },
  { key: "reed_valve", minutes: 910, limit: 900 },
] as const;

export default async function Home() {
  const [t, locale, supabase] = await Promise.all([getDictionary(), getLocale(), createClient()]);
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const h = t.home;

  const start = signedIn ? { href: "/dashboard", label: h.toDashboard } : { href: "/login", label: h.ctaPrimary };

  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col overflow-x-clip bg-zinc-950 text-zinc-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[48rem] bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.14),_transparent_60%)]"
      />

      <header className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className={`text-sm font-semibold tracking-[0.2em] text-cyan-300 uppercase ${focusRing}`}>
            CorsaIQ
          </Link>
          <nav aria-label={h.navLabel} className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <a href="#features" className={`hover:text-white ${focusRing}`}>
              {h.navFeatures}
            </a>
            <a href="#how" className={`hover:text-white ${focusRing}`}>
              {h.navHow}
            </a>
            <a href="#faq" className={`hover:text-white ${focusRing}`}>
              {h.navFaq}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            <Link
              href={signedIn ? "/dashboard" : "/login"}
              className={`inline-flex h-9 items-center rounded-full border border-zinc-700 px-4 text-sm text-zinc-200 transition-colors hover:border-cyan-400/40 hover:text-white ${focusRing}`}
            >
              {signedIn ? h.toDashboard : h.signIn}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pb-24">
          <div className="flex flex-col items-start gap-6">
            <p className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200 uppercase">
              {h.eyebrow}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-5xl">{h.heroTitle}</h1>
            <p className="max-w-xl text-lg leading-8 text-pretty text-zinc-400">{h.heroText}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={start.href} className={`${primaryButtonClass} px-7`}>
                {start.label}
              </Link>
              <a href="#features" className={ghostButtonClass}>
                {h.ctaSecondary}
              </a>
            </div>
          </div>
          <DemoOverview t={t} locale={locale} />
        </section>

        {/* Loggers */}
        <section aria-label={h.loggersLabel} className="border-y border-zinc-800/60 bg-zinc-900/30">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 text-sm sm:px-6">
            <span className="text-zinc-500">{h.loggersLabel}</span>
            {LOGGERS.map((logger) => (
              <span key={logger} className="font-semibold tracking-wide text-zinc-300">
                {logger}
              </span>
            ))}
            <span className="font-semibold tracking-wide text-zinc-300">{h.loggerCsv}</span>
          </div>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-heading" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <h2 id="features-heading" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {h.featuresTitle}
            </h2>
            <p className="mt-4 text-pretty text-zinc-400">{h.featuresText}</p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(FEATURE_ICONS) as (keyof typeof FEATURE_ICONS)[]).map((key) => (
              <li key={key} className={`${cardClass} transition-colors hover:border-cyan-400/30`}>
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  {FEATURE_ICONS[key]}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{h.features[key].title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{h.features[key].text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Spotlights */}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pb-20 sm:gap-28 sm:px-6">
          <Spotlight
            eyebrow={h.maintenance.eyebrow}
            title={h.maintenance.title}
            text={h.maintenance.text}
            points={[h.maintenance.point1, h.maintenance.point2, h.maintenance.point3]}
            visual={<MaintenanceCard t={t} />}
          />
          <Spotlight
            reverse
            eyebrow={h.receipts.eyebrow}
            title={h.receipts.title}
            text={h.receipts.text}
            visual={<ReceiptCard t={t} />}
          />
          <Spotlight eyebrow={h.laps.eyebrow} title={h.laps.title} text={h.laps.text} visual={<LapsCard t={t} />} />
        </div>

        {/* How it works */}
        <section id="how" aria-labelledby="how-heading" className="scroll-mt-20 border-y border-zinc-800/60 bg-zinc-900/30">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="how-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {h.stepsTitle}
            </h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {(["one", "two", "three"] as const).map((key, index) => (
                <li key={key} className="relative flex flex-col gap-3">
                  <span className="text-5xl font-semibold text-cyan-400/80 tabular-nums">{index + 1}</span>
                  <h3 className="text-lg font-semibold tracking-tight">{h.steps[key].title}</h3>
                  <p className="text-sm leading-6 text-zinc-400">{h.steps[key].text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Audience + FAQ */}
        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{h.audienceTitle}</h2>
            <p className="mt-4 max-w-md text-pretty text-zinc-400">{h.audienceText}</p>
            <CheckerFlag />
          </div>
          <div id="faq" className="scroll-mt-20">
            <h2 className="text-xl font-semibold tracking-tight">{h.faqTitle}</h2>
            <div className="mt-4 divide-y divide-zinc-800/80 border-y border-zinc-800/80">
              {(["loggers", "phone", "data", "receipts"] as const).map((key) => (
                <details key={key} className="group py-4">
                  <summary
                    className={`flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-zinc-100 [&::-webkit-details-marker]:hidden ${focusRing}`}
                  >
                    {h.faq[key].question}
                    <span aria-hidden="true" className="text-xl text-zinc-500 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{h.faq[key].answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-zinc-900/60 px-6 py-12 sm:px-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(34,211,238,0.16),_transparent_60%)]"
            />
            <div className="relative flex flex-col items-start gap-5">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{h.finalTitle}</h2>
              <p className="max-w-lg text-zinc-400">{h.finalText}</p>
              <Link href={start.href} className={`${primaryButtonClass} px-7`}>
                {start.label}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © 2026 {h.footer}
          </p>
          <div className="lg:hidden">
            <LanguageSwitcher />
          </div>
        </div>
      </footer>
    </div>
  );
}

function Spotlight({
  eyebrow,
  title,
  text,
  points,
  visual,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  points?: string[];
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={reverse ? "lg:order-2" : undefined}>
        <p className="text-sm font-semibold tracking-wide text-cyan-300 uppercase">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">{title}</h2>
        <p className="mt-4 leading-7 text-pretty text-zinc-400">{text}</p>
        {points && (
          <ul className="mt-6 flex flex-col gap-3 text-sm text-zinc-300">
            {points.map((point) => (
              <li key={point} className="flex gap-3">
                <span aria-hidden="true" className="mt-0.5 text-cyan-300">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={reverse ? "lg:order-1" : undefined}>{visual}</div>
    </section>
  );
}

/** Wraps an example card; the caption says the data is made up. */
function ExampleFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="relative">
      <div aria-hidden="true" className="absolute -inset-4 -z-10 rounded-[2rem] bg-cyan-400/5 blur-2xl" />
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-3 shadow-2xl shadow-black/20 sm:p-4">
        {children}
      </div>
      <figcaption className="mt-3 text-center text-xs text-zinc-500">{label}</figcaption>
    </figure>
  );
}

const barClass = { ok: "bg-cyan-400", soon: "bg-amber-400", due: "bg-red-400" } as const;

function Meter({ share, tone }: { share: number; tone: keyof typeof barClass }) {
  return (
    <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
      <div className={`h-full rounded-full ${barClass[tone]}`} style={{ width: `${Math.min(share, 1) * 100}%` }} />
    </div>
  );
}

function toneFor(share: number) {
  return share >= 1 ? "due" : share >= 0.9 ? "soon" : "ok";
}

function hoursLabel(minutes: number, hourUnit: string) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ${hourUnit}` : `${hours} ${hourUnit} ${rest} min`;
}

function DemoOverview({ t, locale }: { t: Dictionary; locale: string }) {
  const d = t.home.demo;
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const month = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const first = Date.parse(PROGRESS[0].date);
  const best = Math.min(...PROGRESS.map((p) => p.ms));
  const points: LapPoint[] = PROGRESS.map((p) => {
    const date = new Date(p.date);
    return {
      key: p.date,
      xLabel: month.format(date),
      ms: p.ms,
      title: `Genk, ${day.format(date)}`,
      detail: p.ms === best ? t.progress.fastestHere : format(t.progress.vsFastest, { delta: formatDelta(p.ms - best) }),
      position: (Date.parse(p.date) - first) / 86_400_000,
    };
  });

  return (
    <ExampleFrame label={d.label}>
      <div className="flex items-center justify-between px-2 pt-1 pb-3">
        <p className="text-sm font-semibold">{d.title}</p>
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          {d.season}
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[0.65rem] tracking-wide uppercase">
            {d.badge}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-400">{d.costs}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{d.costsValue}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-400">{d.bestLap}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{formatLapTime(best)}</p>
          <p className="mt-0.5 text-[0.7rem] text-cyan-300">{d.bestLapDelta}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3 sm:col-span-1">
          <p className="text-xs text-zinc-400">{d.engine}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">
            {d.engineValue}
            <span className="text-xs font-normal text-zinc-500"> {d.engineLimit}</span>
          </p>
          <div className="mt-2">
            <Meter share={550 / 600} tone="soon" />
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 sm:mt-3">
        <p className="min-w-0 truncate text-xs text-zinc-300">
          <span className="font-semibold text-zinc-100">{d.due}</span> · {d.dueItem}
        </p>
        <span className="shrink-0 text-xs font-medium text-amber-300">▲ {d.dueStatus}</span>
      </div>
      <div className="mt-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3 sm:mt-3">
        <p className="text-xs text-zinc-400">{d.chartLabel}</p>
        <LapTimeChart points={points} label={d.chartLabel} />
      </div>
    </ExampleFrame>
  );
}

function MaintenanceCard({ t }: { t: Dictionary }) {
  const m = t.home.maintenance;
  const hourUnit = t.home.demo.hourUnit;
  const status = { soon: m.soon, due: m.due } as const;
  const statusClass = { soon: "text-amber-300", due: "text-red-300" } as const;

  return (
    <ExampleFrame label={t.home.demo.note}>
      <div className="px-2 pt-1 pb-3">
        <p className="text-sm font-semibold">{m.cardTitle}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {COMPONENTS.map((component) => {
          const share = component.minutes / component.limit;
          const tone = toneFor(share);
          return (
            <li key={component.key} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-3">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-zinc-200">{t.options.engineComponents[component.key]}</span>
                <span className="shrink-0 text-xs text-zinc-400 tabular-nums">
                  {hoursLabel(component.minutes, hourUnit)} / {hoursLabel(component.limit, hourUnit)}
                  {tone !== "ok" && (
                    <span className={`ml-2 font-medium ${statusClass[tone]}`}>
                      {tone === "due" ? "● " : "▲ "}
                      {status[tone]}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-2">
                <Meter share={share} tone={tone} />
              </div>
            </li>
          );
        })}
      </ul>
    </ExampleFrame>
  );
}

function ReceiptCard({ t }: { t: Dictionary }) {
  const r = t.home.receipts;
  const fields = [
    { label: r.amount, value: `€ ${r.amountValue}` },
    { label: r.date, value: r.dateValue },
    { label: r.category, value: t.options.expenseCategories.tyres },
    { label: r.description, value: r.descriptionValue, wide: true },
  ];

  return (
    <ExampleFrame label={t.home.demo.note}>
      <div className="grid items-center gap-3 sm:grid-cols-[0.8fr_auto_1.2fr]">
        {/* Paper stays paper-coloured in both themes. */}
        <div className="mx-auto w-full max-w-[13rem] -rotate-2 rounded-lg bg-[#f5f2ea] p-4 font-mono text-[0.7rem] leading-5 text-[#27272a] shadow-lg">
          <p className="text-center font-bold tracking-widest">{r.receiptShop}</p>
          <p className="text-center text-[#71717a]">14-10-2026 · 15:42</p>
          <div className="my-2 border-t border-dashed border-[#a1a1aa]" />
          <p className="flex justify-between">
            <span>{r.receiptLine1}</span>
            <span>348,00</span>
          </p>
          <p className="flex justify-between">
            <span>{r.receiptLine2}</span>
            <span>30,00</span>
          </p>
          <div className="my-2 border-t border-dashed border-[#a1a1aa]" />
          <p className="flex justify-between font-bold">
            <span>{r.receiptTotal}</span>
            <span>€ 378,00</span>
          </p>
        </div>
        <div aria-hidden="true" className="text-center text-xl text-cyan-300">
          <span className="sm:hidden">↓</span>
          <span className="hidden sm:inline">→</span>
        </div>
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium text-cyan-300">
            <span className="inline-block size-1.5 rounded-full bg-cyan-400" />
            {r.reading}
          </p>
          <dl className="grid grid-cols-2 gap-2">
            {fields.map((field) => (
              <div key={field.label} className={field.wide ? "col-span-2" : undefined}>
                <dt className="text-[0.7rem] text-zinc-500">{field.label}</dt>
                <dd className="mt-1 truncate rounded-lg border border-cyan-400/30 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </ExampleFrame>
  );
}

function LapsCard({ t }: { t: Dictionary }) {
  const l = t.home.laps;
  const best = Math.min(...SESSION_LAPS);
  const worst = Math.max(...SESSION_LAPS);

  return (
    <ExampleFrame label={t.home.demo.note}>
      <div className="flex items-center justify-between px-2 pt-1 pb-3">
        <p className="text-sm font-semibold">{l.cardTitle}</p>
        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[0.65rem] tracking-wide text-zinc-400 uppercase">
          AiM · .csv
        </span>
      </div>
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th scope="col" className="py-2 font-medium">{l.lap}</th>
              <th scope="col" className="py-2 font-medium">{l.time}</th>
              <th scope="col" className="w-2/5 py-2 font-medium">
                <span className="sr-only">{l.gap}</span>
              </th>
              <th scope="col" className="py-2 text-right font-medium">{l.gap}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 tabular-nums">
            {SESSION_LAPS.map((ms, index) => {
              const isBest = ms === best;
              // Bar length shows the gap to the fastest lap.
              const share = worst === best ? 0 : (ms - best) / (worst - best);
              return (
                <tr key={index} className={isBest ? "text-cyan-300" : "text-zinc-300"}>
                  <td className="py-1.5">{index + 2}</td>
                  <td className="py-1.5 font-medium">{formatLapTime(ms)}</td>
                  <td className="py-1.5 pr-3">
                    <div aria-hidden="true" className="h-1.5 rounded-full bg-zinc-800">
                      <div
                        className={`h-full rounded-full ${isBest ? "bg-cyan-400" : "bg-zinc-600"}`}
                        style={{ width: `${isBest ? 4 : 8 + share * 92}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-1.5 text-right text-xs">{isBest ? l.fastest : formatDelta(ms - best)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ExampleFrame>
  );
}

/** A small chequered flag band. */
function CheckerFlag() {
  return (
    <div
      aria-hidden="true"
      className="mt-10 h-16 max-w-xs rounded-xl opacity-60 [background-image:repeating-conic-gradient(var(--color-zinc-700)_0%_25%,transparent_0%_50%)] [background-size:24px_24px] [mask-image:linear-gradient(to_right,black,transparent)]"
    />
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const FEATURE_ICONS = {
  laps: (
    <svg {...iconProps}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M10 2h4M12 2v3" />
    </svg>
  ),
  maintenance: (
    <svg {...iconProps}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />
    </svg>
  ),
  costs: (
    <svg {...iconProps}>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </svg>
  ),
  equipment: (
    <svg {...iconProps}>
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M9 17h6M4 13l3-5h6l2 5M13 8l1-3h3" />
    </svg>
  ),
  season: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  tracks: (
    <svg {...iconProps}>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  ),
};
