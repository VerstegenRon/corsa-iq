"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useT } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { sortByLabel } from "@/lib/karting";

type NavItem = { href: string; key: keyof Dictionary["nav"]; also?: string[] };

// Grouped by what you are doing; A–Z within a group. The overview has no tab: the CorsaIQ logo is the
// home link.
const groups: { key: keyof Dictionary["nav"]; items: NavItem[] }[] = [
  {
    key: "groupRacing",
    items: [
      { href: "/dashboard/seasons", key: "seasons", also: ["/dashboard/events", "/dashboard/sessions"] },
      { href: "/dashboard/tracks", key: "tracks" },
      { href: "/dashboard/drivers", key: "drivers" },
    ],
  },
  {
    key: "groupEquipment",
    items: [
      { href: "/dashboard/karts", key: "karts" },
      { href: "/dashboard/parts", key: "parts" },
    ],
  },
  { key: "groupFinance", items: [{ href: "/dashboard/costs", key: "costs" }] },
];

function useNavGroups() {
  const t = useT();
  const pathname = usePathname();
  return groups.map((group) => ({
    key: group.key,
    label: t.nav[group.key],
    links: sortByLabel(
      group.items.map((item) => ({
        ...item,
        label: t.nav[item.key],
        isActive: [item.href, ...(item.also ?? [])].some((prefix) => pathname.startsWith(prefix)),
      })),
    ),
  }));
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

/** The CorsaIQ logo, linking to the overview; marked as the current page while you are on it. */
export function HomeLink() {
  const t = useT();
  const isHome = usePathname() === "/dashboard";
  return (
    <Link
      href="/dashboard"
      aria-label={t.common.homeLabel}
      aria-current={isHome ? "page" : undefined}
      className="text-sm font-semibold tracking-[0.2em] text-brand-300 uppercase transition-colors hover:text-brand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
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
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
        isActive ? "border-zinc-700 bg-zinc-800 text-white" : "border-zinc-800 text-zinc-300 hover:border-brand-400/40 hover:text-white"
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
      <span className="hidden xl:inline">{t.settings.link}</span>
      <span className="sr-only xl:hidden">{t.settings.link}</span>
    </Link>
  );
}

/** Desktop (lg and up): one row, groups divided by a rule; group names show from xl. */
export function DashboardNav() {
  const t = useT();
  const navGroups = useNavGroups();

  return (
    <nav aria-label={t.common.navLabel} className="flex items-center">
      {navGroups.map((group, index) => (
        <div
          key={group.key}
          role="group"
          aria-label={group.label}
          className={`flex items-center gap-1 ${index > 0 ? "ml-3 border-l border-zinc-800 pl-3" : ""}`}
        >
          <span aria-hidden="true" className="mr-1 hidden text-[11px] font-medium tracking-wider text-zinc-500 uppercase xl:inline">
            {group.label}
          </span>
          {group.links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${focusRing} ${
                item.isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

/**
 * Phones and tablets: a menu button that opens the groups, settings and sign-out as a panel under the
 * header. It closes on Escape and on navigating (it is open only for the page it was opened on).
 */
export function MobileMenu({ signOut }: { signOut: () => Promise<void> }) {
  const t = useT();
  const pathname = usePathname();
  const navGroups = useNavGroups();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const isOpen = openOn === pathname;
  const isSettings = pathname.startsWith("/dashboard/settings");

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) setOpenOn(null);
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? t.nav.closeMenu : t.nav.openMenu}
        onClick={() => setOpenOn(isOpen ? null : pathname)}
        className={`inline-flex size-10 items-center justify-center rounded-full border border-zinc-800 text-zinc-200 transition-colors hover:border-brand-400/40 hover:text-white ${focusRing}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          {isOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {isOpen && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-20 border-b border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
          {/* One line per group, its pages as chips beside it, so the whole menu fits in a few lines. */}
          <nav aria-label={t.common.navLabel} className="mx-auto flex max-w-6xl flex-col gap-3 px-6 pt-4 pb-3">
            {navGroups.map((group) => (
              <div key={group.key} role="group" aria-label={group.label} className="flex items-center gap-2">
                <span aria-hidden="true" className="w-[4.5rem] shrink-0 text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-1">
                  {group.links.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={item.isActive ? "page" : undefined}
                      className={`inline-flex h-9 items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors ${focusRing} ${
                        item.isActive
                          ? "border-zinc-700 bg-zinc-800 text-white"
                          : "border-zinc-800 text-zinc-300 hover:border-brand-400/40 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="mx-auto flex max-w-6xl flex-wrap gap-1.5 border-t border-zinc-800/80 px-6 py-3">
            <Link
              href="/dashboard/settings"
              aria-current={isSettings ? "page" : undefined}
              className={`inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors ${focusRing} ${
                isSettings ? "border-zinc-700 bg-zinc-800 text-white" : "border-zinc-800 text-zinc-300 hover:border-brand-400/40 hover:text-white"
              }`}
            >
              {t.settings.link}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className={`inline-flex h-9 items-center rounded-full border border-zinc-800 px-3 text-sm text-zinc-300 transition-colors hover:border-brand-400/40 hover:text-white ${focusRing}`}
              >
                {t.common.signOut}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
