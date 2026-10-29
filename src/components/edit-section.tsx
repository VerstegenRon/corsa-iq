import type { ReactNode } from "react";

import { EditOnly } from "@/components/edit-access";
import { Icon } from "@/components/icons";
import { cardClass } from "@/components/ui";

export { AddSection } from "@/components/add-section";

/** Collapsed "Bewerken" card with the edit form and, below a divider, the delete control; not for viewers. */
export function EditSection({ title = "Bewerken", children, danger }: { title?: string; children: ReactNode; danger?: ReactNode }) {
  return (
    <EditOnly>
      <details className={`${cardClass} group`}>
        <summary className="cursor-pointer list-none text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            {title}
            <Icon name="chevron" className="size-4 text-zinc-500 transition-transform group-open:rotate-90" />
          </span>
        </summary>
        <div className="mt-6">{children}</div>
        {danger && <div className="mt-8 border-t border-zinc-800/80 pt-6">{danger}</div>}
      </details>
    </EditOnly>
  );
}
