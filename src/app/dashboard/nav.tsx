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
