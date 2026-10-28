"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A–Z by label.
const items: { href: string; label: string; also?: string[] }[] = [
  { href: "/dashboard/karts", label: "Karts" },
  { href: "/dashboard/costs", label: "Kosten" },
  { href: "/dashboard/parts", label: "Onderdelen" },
  { href: "/dashboard", label: "Overzicht" },
  { href: "/dashboard/seasons", label: "Seizoen", also: ["/dashboard/events", "/dashboard/sessions"] },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === item.href
            : [item.href, ...(item.also ?? [])].some((prefix) => pathname.startsWith(prefix));
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
