"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Icon } from "@/components/icons";
import { cardClass } from "@/components/ui";

/**
 * Collapsed "… toevoegen" card, so a list page starts with the list instead of a long form. It starts
 * open when there is nothing in the list yet (`defaultOpen`), and opens when the page's "+" button
 * links to it (`#<id>`).
 */
export function AddSection({
  id = "add",
  title,
  children,
  defaultOpen = false,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const openOnHash = () => {
      if (window.location.hash === `#${id}` && ref.current) {
        ref.current.open = true;
        ref.current.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
      }
    };
    openOnHash();
    window.addEventListener("hashchange", openOnHash);
    return () => window.removeEventListener("hashchange", openOnHash);
  }, [id]);

  return (
    <details ref={ref} id={id} open={defaultOpen || undefined} className={`${cardClass} group scroll-mt-24`}>
      <summary className="cursor-pointer list-none text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-full bg-brand-500 text-on-brand transition-transform group-open:rotate-45"
          >
            <Icon name="plus" className="size-4" />
          </span>
          {title}
        </span>
      </summary>
      <div className="mt-6">{children}</div>
    </details>
  );
}

/** Opens the AddSection with this id on the same page, scrolls to it and focuses its first field. */
export function AddButton({ targetId = "add", children, className }: { targetId?: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      onClick={(event) => {
        const details = document.getElementById(targetId);
        if (!(details instanceof HTMLDetailsElement)) return;
        event.preventDefault();
        details.open = true;
        details.scrollIntoView({ behavior: "smooth", block: "start" });
        details.querySelector<HTMLElement>("input, select, textarea")?.focus({ preventScroll: true });
        history.replaceState(null, "", `#${targetId}`);
      }}
    >
      {children}
    </a>
  );
}
