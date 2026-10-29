import type { Metadata } from "next";

import { DeleteButton } from "@/components/delete-button";
import { IconTile } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { CHECKLIST_CATEGORIES, DEFAULT_CHECKLIST, type ChecklistCategory } from "@/lib/checklist";
import { getCurrentGarage } from "@/lib/garage";
import { sortByLabel } from "@/lib/karting";

import { addChecklistItem, deleteChecklistItem, fillDefaultChecklist } from "../checklist-actions";
import { ActionButton } from "./action-button";
import { ChecklistItemForm } from "./item-form";

export const metadata: Metadata = {
  title: "Paklijst — CorsaIQ",
};

export default async function ChecklistPage() {
  const { supabase, garage } = await getCurrentGarage();
  const { data, error } = await supabase.from("checklist_items").select("id, title, category").eq("garage_id", garage.id);
  if (error) throw new Error(error.message);
  const items = data ?? [];

  const groups = (Object.keys(CHECKLIST_CATEGORIES) as ChecklistCategory[])
    .map((category) => ({ category, items: sortByLabel(items.filter((i) => i.category === category).map((i) => ({ ...i, label: i.title }))) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <PageHeader icon="check" title="Paklijst" subtitle="Je vaste lijst; per evenement vink je af wat mee is" />

      {items.length === 0 ? (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">Begin met de standaardlijst</h2>
          <p className="mt-1 mb-4 text-sm text-zinc-400">
            {DEFAULT_CHECKLIST.length} dingen die bij de meeste kartweekenden mee moeten: gereedschap, banden, brandstof, reserveonderdelen,
            kleding en papieren. Daarna pas je hem aan naar je eigen bus.
          </p>
          <ActionButton action={fillDefaultChecklist} label="Standaardlijst gebruiken" />
          <p className="mt-4 text-xs text-zinc-500">Of zet hieronder zelf je eerste item op de lijst.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {groups.map(({ category, items: groupItems }) => {
            const meta = CHECKLIST_CATEGORIES[category];
            return (
              <section key={category} aria-labelledby={`cat-${category}`} className={`${cardClass} relative overflow-hidden`}>
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: meta.color }} />
                <h2 id={`cat-${category}`} className="flex items-center gap-3 text-lg font-semibold">
                  <IconTile name={meta.icon} color={meta.color} size="sm" />
                  {meta.label}
                  <span className="text-sm font-normal text-zinc-400">{groupItems.length}</span>
                </h2>
                <ul className="mt-3 divide-y divide-zinc-800/80">
                  {groupItems.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm text-zinc-100">{item.title}</span>
                      <DeleteButton
                        action={deleteChecklistItem.bind(null, item.id)}
                        confirmText={`${item.title} van de vaste lijst halen?`}
                        label={`${item.title} verwijderen`}
                        compact
                        iconOnly
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <section aria-labelledby="add-heading" className={cardClass}>
        <h2 id="add-heading" className="mb-3 text-lg font-semibold">
          Item toevoegen
        </h2>
        <ChecklistItemForm action={addChecklistItem} />
        <p className="mt-3 text-xs text-zinc-500">
          Nieuwe items komen ook op de paklijst van evenementen die al begonnen zijn, met de knop ‘Ontbrekende items toevoegen’ daar.
        </p>
      </section>
    </>
  );
}
