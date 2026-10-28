"use client";

import Link from "next/link";
import { useState } from "react";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export type SiteLink = { href: string; label: string; isActive?: boolean };

/** Phone menu of the public pages; closes when a link is chosen or on Escape. */
export function SiteMobileMenu({
  links,
  account,
  signIn,
  labels,
}: {
  links: SiteLink[];
  account: SiteLink;
  signIn: SiteLink | null;
  labels: { open: string; close: string; nav: string };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  return (
    <div
      className="md:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="site-menu"
        aria-label={isOpen ? labels.close : labels.open}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex size-10 items-center justify-center rounded-full border border-zinc-800 text-zinc-200 transition-colors hover:border-brand-400/40 hover:text-white ${focusRing}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          {isOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {isOpen && (
        <div id="site-menu" className="absolute inset-x-0 top-full border-b border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
          <nav aria-label={labels.nav} className="flex flex-col px-4 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                aria-current={link.isActive ? "page" : undefined}
                className={`flex h-12 items-center border-b border-zinc-800/60 text-base transition-colors ${focusRing} ${
                  link.isActive ? "font-semibold text-white" : "text-zinc-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-2 px-4 pt-2 pb-4">
            {signIn && (
              <Link
                href={signIn.href}
                onClick={close}
                className={`inline-flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-700 text-sm text-zinc-200 ${focusRing}`}
              >
                {signIn.label}
              </Link>
            )}
            <Link
              href={account.href}
              onClick={close}
              className={`inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-on-brand hover:bg-brand-600 ${focusRing}`}
            >
              {account.label}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
