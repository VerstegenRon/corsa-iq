"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { sortByLabel } from "@/lib/karting";

// The overview has no tab: the CorsaIQ logo is the home link.
const items: { href: string; key: keyof Dictionary["nav"]; also?: string[] }[] = [
  { href: "/dashboard/tracks", key: "tracks" },
  { href: "/dashboard/drivers", key: "drivers" },
  { href: "/dashboard/karts", key: "karts" },
  { href: "/dashboard/costs", key: "costs" },
  { href: "/dashboard/parts", key: "parts" },
  { href: "/dashboard/seasons", key: "seasons", also: ["/dashboard/events", "/dashboard/sessions"] },
];

/** The CorsaIQ logo, linking to the overview; marked as the current page while you are on it. */
export function HomeLink() {
  const t = useT();
  const isHome = usePathname() === "/dashboard";
  return (
    <Link
      href="/dashboard"
      aria-label={t.common.homeLabel}
      aria-current={isHome ? "page" : undefined}
      className="text-sm font-semibold tracking-[0.2em] text-cyan-300 uppercase transition-colors hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
    >
      CorsaIQ
    </Link>
  );
}

/** Gear button to the settings page (language, theme, profile, account). */
export function SettingsLink() {
  const t = useT();
  const isActive = usePathname().startsWith("/dashboard/settings");
  return (
    <Link
      href="/dashboard/settings"
      aria-current={isActive ? "page" : undefined}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
        isActive ? "border-zinc-700 bg-zinc-800 text-white" : "border-zinc-800 text-zinc-300 hover:border-cyan-400/40 hover:text-white"
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
      <span className="hidden sm:inline">{t.settings.link}</span>
      <span className="sr-only sm:hidden">{t.settings.link}</span>
    </Link>
  );
}

export function DashboardNav() {
  const t = useT();
  const pathname = usePathname();
  // A–Z in the current language.
  const links = sortByLabel(items.map((item) => ({ ...item, label: t.nav[item.key] })));

  return (
    <nav aria-label={t.common.navLabel} className="flex flex-wrap gap-1">
      {links.map((item) => {
        const isActive = [item.href, ...(item.also ?? [])].some((prefix) => pathname.startsWith(prefix));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
              isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
