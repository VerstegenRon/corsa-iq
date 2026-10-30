import type { Metadata } from "next";

import { DeleteButton } from "@/components/delete-button";
import { EditOnly } from "@/components/edit-access";
import { IconTile } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { cardClass } from "@/components/ui";
import { CHECKLIST_CATEGORIES, DEFAULT_CHECKLIST_SIZE, type ChecklistCategory } from "@/lib/checklist";
import { getCurrentGarage } from "@/lib/garage";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { sortByLabel } from "@/lib/karting";

import { addChecklistItem, deleteChecklistItem, fillDefaultChecklist } from "../checklist-actions";
import { ActionButton } from "./action-button";
import { ChecklistItemForm } from "./item-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getDictionary()).checklist.title} — CorsaIQ` };
}

export default async function ChecklistPage() {
  const { supabase, garage } = await getCurrentGarage();
  const tc = (await getDictionary()).checklist;
  const { data, error } = await supabase.from("checklist_items").select("id, title, category").eq("garage_id", garage.id);
  if (error) throw new Error(error.message);
  const items = data ?? [];

  const groups = (Object.keys(CHECKLIST_CATEGORIES) as ChecklistCategory[])
    .map((category) => ({ category, items: sortByLabel(items.filter((i) => i.category === category).map((i) => ({ ...i, label: i.title }))) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <PageHeader icon="check" title={tc.title} subtitle={tc.subtitle} />

      {items.length === 0 ? (
        <section className={cardClass}>
          <EditOnly fallback={<p className="text-sm text-zinc-400">{tc.noList}</p>}>
            <h2 className="text-lg font-semibold">{tc.startTitle}</h2>
            <p className="mt-1 mb-4 text-sm text-zinc-400">{format(tc.startText, { count: DEFAULT_CHECKLIST_SIZE })}</p>
            <ActionButton action={fillDefaultChecklist} label={tc.useDefault} />
            <p className="mt-4 text-xs text-zinc-500">{tc.orOwn}</p>
          </EditOnly>
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
                  {tc.categories[category]}
                  <span className="text-sm font-normal text-zinc-400">{groupItems.length}</span>
                </h2>
                <ul className="mt-3 divide-y divide-zinc-800/80">
                  {groupItems.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-sm text-zinc-100">{item.title}</span>
                      <DeleteButton
                        action={deleteChecklistItem.bind(null, item.id)}
                        confirmText={format(tc.removeConfirm, { item: item.title })}
                        label={format(tc.removeLabel, { item: item.title })}
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

      <EditOnly>
        <section aria-labelledby="add-heading" className={cardClass}>
          <h2 id="add-heading" className="mb-3 text-lg font-semibold">
            {tc.addItem}
          </h2>
          <ChecklistItemForm action={addChecklistItem} />
          <p className="mt-3 text-xs text-zinc-500">{format(tc.laterNote, { button: tc.addMissing })}</p>
        </section>
      </EditOnly>
    </>
  );
}
