// Top menu and footer of the public pages (homepage and pricing). The dashboard has its own nav.

import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteMobileMenu, type SiteLink } from "@/components/site-mobile-menu";
import type { Dictionary } from "@/lib/i18n/dictionaries/nl";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export type SitePage = "home" | "pricing";

function siteLinks(t: Dictionary, current: SitePage): SiteLink[] {
  return [
    { href: "/#features", label: t.home.navFeatures },
    { href: "/#how", label: t.home.navHow },
    { href: "/pricing", label: t.home.navPricing, isActive: current === "pricing" },
    { href: "/#faq", label: t.home.navFaq },
  ];
}

export function SiteHeader({ t, current, signedIn }: { t: Dictionary; current: SitePage; signedIn: boolean }) {
  const links = siteLinks(t, current);
  const account = signedIn
    ? { href: "/dashboard", label: t.home.toDashboard }
    : { href: "/login", label: t.home.ctaPrimary };

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-zinc-950/85 backdrop-blur">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className={`font-display text-lg font-black tracking-tight text-zinc-50 ${focusRing}`}>
          CORSA<span className="text-brand-400">/</span>IQ
        </Link>

        <nav aria-label={t.home.navLabel} className="hidden items-center gap-1 text-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.isActive ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 transition-colors ${focusRing} ${
                link.isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          {!signedIn && (
            <Link
              href="/login"
              className={`hidden h-9 items-center rounded-full px-3 text-sm text-zinc-300 transition-colors hover:text-white sm:inline-flex ${focusRing}`}
            >
              {t.home.signIn}
            </Link>
          )}
          <Link
            href={account.href}
            className={`hidden h-9 items-center rounded-full bg-brand-500 px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-600 sm:inline-flex ${focusRing}`}
          >
            {account.label}
          </Link>
          <SiteMobileMenu
            links={links}
            account={account}
            signIn={signedIn ? null : { href: "/login", label: t.home.signIn }}
            labels={{ open: t.nav.openMenu, close: t.nav.closeMenu, nav: t.home.navLabel }}
          />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ t, current }: { t: Dictionary; current: SitePage }) {
  return (
    <footer className="border-t border-zinc-800/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-zinc-500 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>© 2026 {t.home.footer}</p>
        <nav aria-label={t.home.footerNavLabel} className="flex flex-wrap gap-x-5 gap-y-2">
          {siteLinks(t, current).map((link) => (
            <Link key={link.href} href={link.href} className={`hover:text-white ${focusRing}`}>
              {link.label}
            </Link>
          ))}
          <Link href="/login" className={`hover:text-white ${focusRing}`}>
            {t.home.signIn}
          </Link>
          <Link href="/privacy" className={`hover:text-white ${focusRing}`}>
            {t.login.privacy}
          </Link>
          <Link href="/voorwaarden" className={`hover:text-white ${focusRing}`}>
            {t.login.terms}
          </Link>
        </nav>
        <div className="lg:hidden">
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
