import type { ReactNode } from "react";

import { cardClass } from "@/components/ui";

/** Collapsed "Bewerken" card with the edit form and, below a divider, the delete control. */
export function EditSection({ title = "Bewerken", children, danger }: { title?: string; children: ReactNode; danger?: ReactNode }) {
  return (
    <details className={`${cardClass} group`}>
      <summary className="cursor-pointer list-none text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          {title}
          <span aria-hidden="true" className="text-sm text-zinc-500 transition-transform group-open:rotate-90">
            ›
          </span>
        </span>
      </summary>
      <div className="mt-6">{children}</div>
      {danger && <div className="mt-8 border-t border-zinc-800/80 pt-6">{danger}</div>}
    </details>
  );
}
