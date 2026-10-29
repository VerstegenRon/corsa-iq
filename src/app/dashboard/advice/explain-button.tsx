"use client";

import { useState, useTransition } from "react";

import { primaryButtonClass } from "@/components/ui";
import type { AnalysisLength } from "@/lib/advice-explainer";

import { explainAdvice } from "../advice-actions";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

const LENGTHS: { value: AnalysisLength; label: string; hint: string }[] = [
  { value: "short", label: "Kort", hint: "Kernpunten, snel te lezen tussen sessies" },
  { value: "full", label: "Uitgebreid", hint: "Volledige toelichting, als er tijd is" },
];

/** The analysis text: lines starting with "- " as a list, the rest as paragraphs. */
function AnalysisText({ text }: { text: string }) {
  const blocks: ({ list: string[] } | { paragraph: string })[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const item = line.match(/^[-•*]\s+(.*)$/)?.[1];
    const last = blocks.at(-1);
    if (item === undefined) blocks.push({ paragraph: line });
    else if (last && "list" in last) last.list.push(item);
    else blocks.push({ list: [item] });
  }
  return (
    <div className="flex flex-col gap-3 text-sm text-zinc-200">
      {blocks.map((block, i) =>
        "list" in block ? (
          <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-brand-400">
            {block.list.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{block.paragraph}</p>
        ),
      )}
    </div>
  );
}

/** Has Claude write an analysis of the findings; only on request, as it takes a few seconds. */
export function ExplainButton({ trackId }: { trackId: string | null }) {
  const [length, setLength] = useState<AnalysisLength>("short");
  const [result, setResult] = useState<{ length: AnalysisLength; answer: { text: string } | { error: string } } | null>(null);
  const [pending, startTransition] = useTransition();
  const current = result?.length === length && "text" in result.answer;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="Lengte van de analyse" className="inline-flex rounded-full border border-zinc-800 p-1">
          {LENGTHS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={length === option.value}
              onClick={() => setLength(option.value)}
              className={`h-9 rounded-full px-4 text-sm transition-colors ${focusRing} ${
                length === option.value ? "bg-zinc-800 font-medium text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setResult({ length, answer: await explainAdvice(trackId, length) }))}
          className={primaryButtonClass}
        >
          {pending ? "Analyse wordt opgesteld…" : current ? "Analyse vernieuwen" : "Analyse opstellen"}
        </button>
      </div>
      <p className="-mt-2 text-xs text-zinc-500">{LENGTHS.find((o) => o.value === length)!.hint}.</p>
      <div aria-live="polite">
        {result && "text" in result.answer && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="mb-3 text-xs font-medium tracking-wide text-zinc-500 uppercase">
              {result.length === "short" ? "Korte analyse" : "Uitgebreide analyse"}
            </p>
            <AnalysisText text={result.answer.text} />
            <p className="mt-4 text-xs text-zinc-500">Opgesteld door Claude (AI), uitsluitend op basis van de gevonden verbanden.</p>
          </div>
        )}
        {result && "error" in result.answer && <p className="text-sm text-amber-200">{result.answer.error}</p>}
      </div>
    </div>
  );
}
