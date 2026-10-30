"use client";

// The packing list of one event, made for a phone in the paddock: big rows to tick, progress on top,
// the app's suggestions above the list, and ticking that answers at once (saved in the background).

import Link from "next/link";
import { useState, useTransition } from "react";

import { DeleteButton } from "@/components/delete-button";
import { useCanEdit } from "@/components/edit-access";
import { Icon, IconTile } from "@/components/icons";
import { cardClass, linkClass } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { CHECKLIST_CATEGORIES, type ChecklistCategory } from "@/lib/checklist";
import type { Suggestion } from "@/lib/checklist-suggestions";

import {
  addEventChecklistItem,
  addSuggestedItem,
  copyChecklistToEvent,
  deleteEventChecklistItem,
  toggleEventChecklistItem,
} from "../../checklist-actions";
import { ActionButton } from "../../checklist/action-button";
import { ChecklistItemForm } from "../../checklist/item-form";

export type EventChecklistItem = {
  id: string;
  title: string;
  category: string;
  checked: boolean;
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";
const SUGGESTION_ICON = {
  rain: "rain",
  gear: "helmet",
  maintenance: "wrench",
} as const;

export function EventChecklist({ eventId, items, suggestions }: { eventId: string; items: EventChecklistItem[]; suggestions: Suggestion[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.id, i.checked])));
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tc = useT().checklist;
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState<string | null>(null);
  // Viewers see what is packed, but cannot tick, add or remove.
  const canEdit = useCanEdit();

  if (items.length === 0) {
    if (!canEdit) return null;
    return (
      <section aria-labelledby="checklist-heading" className={cardClass}>
        <h2 id="checklist-heading" className="text-lg font-semibold">
          Paklijst
        </h2>
        <p className="mt-1 mb-4 text-sm text-zinc-400">
          Zet je vaste paklijst klaar voor dit evenement en vink af wat in de bus ligt. Heb je nog geen vaste lijst, dan begin je met de
          standaardlijst.
        </p>
        <ActionButton action={copyChecklistToEvent.bind(null, eventId)} label="Paklijst maken" pendingLabel="Paklijst maken…" />
      </section>
    );
  }

  const isChecked = (item: EventChecklistItem) => checked[item.id] ?? item.checked;
  const done = items.filter(isChecked).length;
  const share = done / items.length;

  function toggle(item: EventChecklistItem) {
    const next = !isChecked(item);
    setChecked((state) => ({ ...state, [item.id]: next }));
    setError(null);
    startTransition(async () => {
      const result = await toggleEventChecklistItem(item.id, next);
      if (result.error) {
        setChecked((state) => ({ ...state, [item.id]: !next }));
        setError(result.error);
      }
    });
  }

  function addSuggestion(suggestion: Suggestion) {
    setAdding(suggestion.key);
    startTransition(async () => {
      const result = await addSuggestedItem(eventId, suggestion.key, suggestion.title, suggestion.category);
      if (result.error) setError(result.error);
      setAdding(null);
    });
  }

  const groups = (Object.keys(CHECKLIST_CATEGORIES) as ChecklistCategory[])
    .map((category) => ({
      category,
      items: items.filter((i) => i.category === category).filter((i) => !onlyOpen || !isChecked(i)),
      total: items.filter((i) => i.category === category).length,
      done: items.filter((i) => i.category === category && isChecked(i)).length,
    }))
    .filter((group) => group.total > 0);

  return (
    <section aria-labelledby="checklist-heading" className={cardClass}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="checklist-heading" className="text-lg font-semibold">
          Paklijst
        </h2>
        <button
          type="button"
          onClick={() => setOnlyOpen((v) => !v)}
          aria-pressed={onlyOpen}
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${focusRing} ${
            onlyOpen ? "border-brand-400 bg-brand-500/15 text-zinc-50" : "border-zinc-700 text-zinc-300 hover:text-white"
          }`}
        >
          Alleen nog te doen
        </button>
      </div>

      {/* Progress: how much is in the van. */}
      <div className="mt-3">
        <p className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-zinc-200">
            <span className="text-2xl font-semibold text-zinc-50">{done}</span> van {items.length} ingepakt
          </span>
          <span className="font-medium text-zinc-300">{Math.round(share * 100)}%</span>
        </p>
        <div
          role="progressbar"
          aria-label="Ingepakt"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={done}
          className="mt-2 h-3 overflow-hidden rounded-full"
          style={{
            background: "color-mix(in oklab, var(--chart-3) 18%, transparent)",
          }}
        >
          <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${share * 100}%`, background: "var(--chart-3)" }} />
        </div>
        {done === items.length && <p className="mt-2 text-sm font-medium text-zinc-100">Alles ingepakt. Goede race!</p>}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-300">De app denkt mee</h3>
          {suggestions.map((s) => {
            // Already on the list (rain tyres usually are): the reminder still counts, adding it does not.
            const onList = items.some((i) => i.title.trim().toLowerCase() === s.title.trim().toLowerCase());
            return (
              <div
                key={s.key}
                className="flex items-start gap-3 rounded-xl border p-3"
                style={{
                  borderColor: "color-mix(in oklab, var(--chart-4) 50%, transparent)",
                  background: "color-mix(in oklab, var(--chart-4) 10%, transparent)",
                }}
              >
                <IconTile name={SUGGESTION_ICON[s.kind]} color="var(--chart-4)" size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-100">{s.title}</span>
                  <span className="block text-xs text-zinc-300">{s.reason}</span>
                </span>
                {onList ? (
                  <span className="shrink-0 px-1 py-1.5 text-xs text-zinc-300">Staat al op je lijst</span>
                ) : !canEdit ? null : (
                  <button
                    type="button"
                    onClick={() => addSuggestion(s)}
                    disabled={adding === s.key}
                    className={`shrink-0 rounded-full border border-zinc-600 px-3 py-1.5 text-sm text-zinc-100 hover:border-brand-400 ${focusRing}`}
                  >
                    {adding === s.key ? "…" : "Op de lijst"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-5 flex flex-col gap-5">
        {groups.map((group) => {
          const meta = CHECKLIST_CATEGORIES[group.category];
          return (
            <div key={group.category}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: meta.color }} />
                {tc.categories[group.category]}
                <span className="font-normal text-zinc-400">
                  {group.done}/{group.total}
                </span>
              </h3>
              {group.items.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-500">Alles ingepakt.</p>
              ) : (
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {group.items.map((item) => {
                    const on = isChecked(item);
                    return (
                      <li key={item.id} className="flex items-center gap-2">
                        <label
                          className={`flex min-h-12 flex-1 items-center ${canEdit ? "cursor-pointer" : ""} gap-3 rounded-xl border px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-400 ${
                            on ? "border-transparent" : `border-zinc-800 ${canEdit ? "hover:border-zinc-600" : ""}`
                          }`}
                          style={
                            on
                              ? {
                                  background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                                }
                              : undefined
                          }
                        >
                          <input type="checkbox" checked={on} disabled={!canEdit} onChange={() => toggle(item)} className="sr-only" />
                          <span
                            aria-hidden="true"
                            className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? "border-transparent text-white" : "border-zinc-600"}`}
                            style={on ? { background: meta.color } : undefined}
                          >
                            {on && <Icon name="check" className="size-4" />}
                          </span>
                          <span className={`text-base ${on ? "text-zinc-300 line-through decoration-zinc-500" : "text-zinc-100"}`}>{item.title}</span>
                        </label>
                        <DeleteButton
                          action={deleteEventChecklistItem.bind(null, item.id, eventId)}
                          confirmText={`${item.title} van deze paklijst halen?`}
                          label={`${item.title} verwijderen`}
                          compact
                          iconOnly
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div className="mt-6 border-t border-zinc-800/80 pt-5">
          <h3 className="mb-2 text-sm font-medium text-zinc-300">Extra voor dit evenement</h3>
          <ChecklistItemForm action={addEventChecklistItem.bind(null, eventId)} />
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <ActionButton
              action={copyChecklistToEvent.bind(null, eventId)}
              label="Ontbrekende items uit je vaste lijst toevoegen"
              pendingLabel="Bezig…"
              variant="secondary"
            />
            <Link href="/dashboard/checklist" className={`${linkClass} text-sm`}>
              Vaste lijst bewerken
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
