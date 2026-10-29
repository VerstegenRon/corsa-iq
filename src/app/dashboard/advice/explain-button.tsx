"use client";

import { useState, useTransition } from "react";

import { secondaryButtonClass } from "@/components/ui";

import { explainAdvice } from "../advice-actions";

/** Asks Claude to put the findings into words; only on a tap, as it takes a few seconds. */
export function ExplainButton({ trackId }: { trackId: string | null }) {
  const [result, setResult] = useState<{ text: string } | { error: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setResult(await explainAdvice(trackId)))}
          className={secondaryButtonClass}
        >
          {pending ? "Claude denkt na…" : result && "text" in result ? "Opnieuw uitleggen" : "Leg uit met Claude"}
        </button>
      </div>
      <div aria-live="polite">
        {result && "text" in result && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm whitespace-pre-line text-zinc-200">{result.text}</p>
            <p className="mt-3 text-xs text-zinc-500">Uitleg door Claude, alleen op basis van de verbanden op deze pagina.</p>
          </div>
        )}
        {result && "error" in result && <p className="text-sm text-amber-200">{result.error}</p>}
      </div>
    </div>
  );
}
