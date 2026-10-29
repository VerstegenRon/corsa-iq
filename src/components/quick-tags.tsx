"use client";

// The debrief buttons ("Onderstuur in", "Stuitert", …): real checkboxes named "quick", drawn as big
// toggles so they can be tapped with gloves on. Selected is a volt block with black text.

import { useState } from "react";

import { QUICK_TAGS, type QuickTag } from "@/lib/feedback";

const focusRing = "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-400";

export function QuickTagToggles({ defaultValue = [] }: { defaultValue?: QuickTag[] }) {
  const [selected, setSelected] = useState<QuickTag[]>(defaultValue);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="channel-label mb-2">Hoe voelde de kart?</legend>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {(Object.keys(QUICK_TAGS) as QuickTag[]).map((key) => {
          const on = selected.includes(key);
          return (
            <label
              key={key}
              className={`flex min-h-12 cursor-pointer items-center justify-center border px-3 text-center text-sm font-semibold ${focusRing} ${
                on ? "border-brand-400 bg-brand-500 text-on-brand" : "border-zinc-800 text-zinc-200 hover:border-zinc-600"
              }`}
            >
              <input
                type="checkbox"
                name="quick"
                value={key}
                checked={on}
                onChange={(event) => setSelected((s) => (event.target.checked ? [...s, key] : s.filter((k) => k !== key)))}
                className="sr-only"
              />
              {QUICK_TAGS[key]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
