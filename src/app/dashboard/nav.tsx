"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { useT } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";
import { sortByLabel } from "@/lib/karting";

type NavItem = { href: string; key: keyof Dictionary["nav"]; icon: IconName; also?: string[] };

// Grouped by what you are doing; A–Z within a group. The overview has no tab: the CorsaIQ logo is the
// home link.
const groups: { key: keyof Dictionary["nav"]; items: NavItem[] }[] = [
  {
    key: "groupRacing",
    items: [
      { href: "/dashboard/agenda", key: "agenda", icon: "agenda" },
      { href: "/dashboard/seasons", key: "seasons", icon: "calendar", also: ["/dashboard/events", "/dashboard/sessions"] },
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

/**
 * To the pitwall, the trackside screen. A plain link, not a client-side navigation, so the service
 * worker sees the page load and keeps a fresh copy for when there is no signal.
 */
export function PitwallLink() {
  const t = useT();
  return (
    <a
      href="/pitwall"
      className={`inline-flex h-9 items-center gap-2 rounded-full border border-brand-400/50 px-3 text-sm font-medium text-brand-200 transition-colors hover:border-brand-400 hover:text-white ${focusRing}`}
    >
      <Icon name="stopwatch" className="size-4" />
      {t.nav.pitwall}
    </a>
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
      <Icon name="settings" className="size-4" />
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
          <span aria-hidden="true" className="mr-1 hidden text-[11px] font-medium tracking-wider text-zinc-500 uppercase 2xl:inline">
            {group.label}
          </span>
          {group.links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${focusRing} ${
                item.isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon name={item.icon} className={`hidden size-4 xl:inline-block ${item.isActive ? "text-brand-300" : ""}`} />
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
          {/* All pages as icon tiles, four to a row, so the whole menu fits in two rows. */}
          <nav aria-label={t.common.navLabel} className="mx-auto grid max-w-6xl grid-cols-4 gap-2 px-4 pt-4 pb-3 sm:px-6">
            {navGroups.flatMap((group) => group.links).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-3 text-xs transition-colors ${focusRing} ${
                  item.isActive
                    ? "border-zinc-700 bg-zinc-800 text-white"
                    : "border-zinc-800 text-zinc-300 hover:border-brand-400/40 hover:text-white"
                }`}
              >
                <Icon name={item.icon} className={`size-5 ${item.isActive ? "text-brand-300" : "text-zinc-400"}`} />
                {item.label}
              </Link>
            ))}
            <Link
              href="/dashboard/settings"
              aria-current={isSettings ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-3 text-xs transition-colors ${focusRing} ${
                  isSettings
                    ? "border-zinc-700 bg-zinc-800 text-white"
                    : "border-zinc-800 text-zinc-300 hover:border-brand-400/40 hover:text-white"
                }`}
            >
              <Icon name="settings" className={`size-5 ${isSettings ? "text-brand-300" : "text-zinc-400"}`} />
              {t.settings.link}
            </Link>
          </nav>
          <div className="mx-auto flex max-w-6xl justify-end border-t border-zinc-800/80 px-4 py-3 sm:px-6">
            <form action={signOut}>
              <button
                type="submit"
                className={`inline-flex h-9 items-center rounded-full border border-zinc-800 px-4 text-sm text-zinc-300 transition-colors hover:border-brand-400/40 hover:text-white ${focusRing}`}
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
