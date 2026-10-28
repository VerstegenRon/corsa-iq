"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A–Z by label. The overview has no tab: the CorsaIQ logo is the home link.
const items: { href: string; label: string; also?: string[] }[] = [
  { href: "/dashboard/tracks", label: "Circuits" },
  { href: "/dashboard/drivers", label: "Coureurs" },
  { href: "/dashboard/karts", label: "Karts" },
  { href: "/dashboard/costs", label: "Kosten" },
  { href: "/dashboard/parts", label: "Onderdelen" },
  { href: "/dashboard/seasons", label: "Seizoen", also: ["/dashboard/events", "/dashboard/sessions"] },
];

/** The CorsaIQ logo, linking to the overview; marked as the current page while you are on it. */
export function HomeLink() {
  const isHome = usePathname() === "/dashboard";
  return (
    <Link
      href="/dashboard"
      aria-label="CorsaIQ – overzicht"
      aria-current={isHome ? "page" : undefined}
      className="text-sm font-semibold tracking-[0.2em] text-cyan-300 uppercase transition-colors hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
    >
      CorsaIQ
    </Link>
  );
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex flex-wrap gap-1">
      {items.map((item) => {
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
