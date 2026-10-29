"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { useT } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { sortByLabel } from "@/lib/karting";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

type NavKey = keyof Dictionary["nav"];

/**
 * The four places you go to most, plus the season: on a phone as a bar at the bottom, on a tablet
 * and desktop in the header. The pitwall (quick logging, also offline) and the pitbord are under "Meer".
 */
type Destination = { key: NavKey; href: string; icon: IconName; also?: string[]; exact?: boolean; plain?: boolean; phone: boolean };

const DESTINATIONS: Destination[] = [
  { key: "today", href: "/dashboard/vandaag", icon: "check", phone: true },
  { key: "live", href: "/dashboard/live", icon: "stopwatch", phone: true },
  { key: "analysis", href: "/dashboard/analyse", icon: "gauge", also: ["/dashboard/sessions"], phone: true },
  { key: "setup", href: "/dashboard/setups", icon: "compare", phone: true },
  { key: "seasonMaterial", href: "/dashboard/seizoen", icon: "calendar", phone: false },
];

// Everything else, grouped by what you are doing; A–Z within a group.
const MORE: { key: NavKey; items: { href: string; key: NavKey; icon: IconName }[] }[] = [
  {
    key: "groupRacing",
    items: [
      { href: "/dashboard", key: "overview", icon: "home" },
      { href: "/pitwall", key: "pitwall", icon: "stopwatch" },
      { href: "/pitbord", key: "pitboard", icon: "flag" },
      { href: "/dashboard/seasons", key: "seasons", icon: "calendar" },
      { href: "/dashboard/agenda", key: "agenda", icon: "agenda" },
      { href: "/dashboard/tracks", key: "tracks", icon: "flag" },
      { href: "/dashboard/advice", key: "advice", icon: "target" },
      { href: "/dashboard/drivers", key: "drivers", icon: "user" },
    ],
  },
  {
    key: "groupEquipment",
    items: [
      { href: "/dashboard/karts", key: "karts", icon: "kart" },
      { href: "/dashboard/parts", key: "parts", icon: "engine" },
      { href: "/dashboard/gear", key: "gear", icon: "helmet" },
      { href: "/dashboard/checklist", key: "checklist", icon: "check" },
    ],
  },
  { key: "groupFinance", items: [{ href: "/dashboard/costs", key: "costs", icon: "euro" }] },
];

function isActive(pathname: string, d: Destination) {
  if (d.exact) return pathname === d.href;
  return [d.href, ...(d.also ?? [])].some((prefix) => pathname.startsWith(prefix));
}

/** CORSA/IQ, linking to Vandaag; marked as the current page while you are on it. */
export function HomeLink() {
  const t = useT();
  const isHome = usePathname() === "/dashboard";
  return (
    <Link
      href="/dashboard"
      aria-label={t.common.homeLabel}
      aria-current={isHome ? "page" : undefined}
      className={`font-display text-lg font-black tracking-tight text-zinc-50 ${focusRing}`}
    >
      CORSA<span className="text-brand-400">/</span>IQ
    </Link>
  );
}

function DestinationLink({ d, variant }: { d: Destination; variant: "top" | "bottom" }) {
  const t = useT();
  const active = isActive(usePathname(), d);
  const className =
    variant === "top"
      ? `inline-flex min-h-11 items-center px-3.5 text-sm whitespace-nowrap transition-colors ${focusRing} ${
          active ? "bg-brand-500 font-bold text-on-brand" : "text-zinc-400 hover:text-zinc-50"
        }`
      : `flex flex-1 flex-col items-center justify-center gap-1 text-[11px] tracking-wide uppercase transition-colors ${focusRing} ${
          active ? "bg-brand-500 font-bold text-on-brand" : "text-zinc-400 hover:text-zinc-50"
        }`;
  const content = (
    <>
      {variant === "bottom" && <Icon name={d.icon} className="size-5" />}
      {t.nav[d.key]}
    </>
  );
  return d.plain ? (
    <a href={d.href} aria-current={active ? "page" : undefined} className={className}>
      {content}
    </a>
  ) : (
    <Link href={d.href} aria-current={active ? "page" : undefined} className={className}>
      {content}
    </Link>
  );
}

/** Tablet and desktop: the destinations in the header. */
export function DashboardNav() {
  const t = useT();
  return (
    <nav aria-label={t.common.navLabel} className="flex items-center gap-0.5">
      {DESTINATIONS.map((d) => (
        <DestinationLink key={d.key} d={d} variant="top" />
      ))}
    </nav>
  );
}

/** Phone: a bar fixed at the bottom with the four main destinations. */
export function BottomNav() {
  const t = useT();
  return (
    <nav
      aria-label={t.common.navLabel}
      className="fixed inset-x-3 bottom-3 z-30 flex h-[68px] border border-zinc-800 bg-zinc-900 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {DESTINATIONS.filter((d) => d.phone).map((d) => (
        <DestinationLink key={d.key} d={d} variant="bottom" />
      ))}
    </nav>
  );
}

/**
 * "Meer": every other page, settings and sign-out, as a panel under the header. It closes on Escape
 * and on navigating (it is open only for the page it was opened on).
 */
export function MoreMenu({ signOut }: { signOut: () => Promise<void> }) {
  const t = useT();
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const isOpen = openOn === pathname;
  const groups = MORE.map((group) => ({
    key: group.key,
    links: sortByLabel(
      group.items.map((item) => ({
        ...item,
        label: t.nav[item.key],
        // The overview is /dashboard itself; every other page lives under it.
        isActive: item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href),
      })),
    ),
  }));
  const tile = (active: boolean) =>
    `flex min-h-14 items-center gap-3 border px-3 text-sm transition-colors ${focusRing} ${
      active ? "border-brand-400 bg-brand-500 font-bold text-on-brand" : "border-zinc-800 text-zinc-200 hover:border-zinc-600"
    }`;

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) setOpenOn(null);
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="more-menu"
        onClick={() => setOpenOn(isOpen ? null : pathname)}
        className={`inline-flex min-h-11 items-center gap-2 border border-zinc-800 px-3 text-sm text-zinc-200 transition-colors hover:border-zinc-600 ${focusRing}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="square">
          {isOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        {t.nav.more}
      </button>

      {isOpen && (
        <div id="more-menu" className="absolute inset-x-0 top-full z-40 border-b border-zinc-800 bg-zinc-950">
          <nav aria-label={t.nav.more} className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:grid-cols-3 sm:px-6">
            {groups.map((group) => (
              <div key={group.key}>
                <p className="channel-label mb-2">{t.nav[group.key]}</p>
                <ul className="grid grid-cols-2 gap-1 sm:grid-cols-1">
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} aria-current={item.isActive ? "page" : undefined} className={tile(item.isActive)}>
                        <Icon name={item.icon} className="size-5 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="mx-auto flex max-w-6xl flex-wrap justify-end gap-2 border-t border-zinc-800 px-4 py-3 sm:px-6">
            <Link href="/dashboard/settings" aria-current={pathname.startsWith("/dashboard/settings") ? "page" : undefined} className={tile(pathname.startsWith("/dashboard/settings"))}>
              <Icon name="settings" className="size-5" />
              {t.settings.link}
            </Link>
            <form action={signOut}>
              <button type="submit" className={tile(false)}>
                {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
