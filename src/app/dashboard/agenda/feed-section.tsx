"use client";

import { useState, useTransition } from "react";

import { DeleteButton } from "@/components/delete-button";
import { inputClass, linkClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";

import { createCalendarFeed, deleteCalendarFeed } from "../agenda-actions";

/** The member's private subscription link, to add the agenda to a phone's calendar app. */
export function FeedSection({ url }: { url: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);

  const make = () =>
    startTransition(async () => {
      setError(null);
      const result = await createCalendarFeed();
      if (result.error) setError(result.error);
      setRenewing(false);
      setCopied(false);
    });

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Kopiëren lukte niet. Selecteer de link en kopieer hem zelf.");
    }
  };

  if (!url) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-400">
          Maak een persoonlijke link en voeg die toe in Google Agenda, Apple Agenda of Outlook. Je evenementen, afspraken en het geplande
          onderhoud verschijnen dan vanzelf in je telefoonagenda.
        </p>
        <div>
          <button type="button" onClick={make} disabled={pending} className={primaryButtonClass}>
            {pending ? "Link maken…" : "Abonnementslink maken"}
          </button>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} aria-label="Abonnementslink" onFocus={(e) => e.currentTarget.select()} className={`${inputClass} font-mono text-xs`} />
        <button type="button" onClick={copy} className={`${secondaryButtonClass} h-11 shrink-0`}>
          {copied ? "Gekopieerd" : "Kopiëren"}
        </button>
      </div>
      <a href={url.replace(/^https?:/, "webcal:")} className={`${linkClass} self-start text-sm`}>
        Openen in je agenda-app
      </a>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-zinc-400">
        <li>iPhone en iPad: tik op ‘Openen in je agenda-app’ en kies Abonneer.</li>
        <li>Google Agenda: op de computer bij Andere agenda’s → Via URL, en plak de link.</li>
        <li>Outlook: Agenda toevoegen → Abonneren vanaf internet.</li>
      </ul>
      <p className="text-xs text-zinc-500">
        Iedereen met deze link kan je agenda lezen, deel hem dus niet. Agenda-apps halen wijzigingen meestal een paar keer per dag op.
      </p>
      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800/80 pt-4">
        {renewing ? (
          <>
            <span className="text-sm text-zinc-300">De oude link werkt dan niet meer.</span>
            <button type="button" onClick={make} disabled={pending} className={secondaryButtonClass}>
              {pending ? "Bezig…" : "Ja, nieuwe link"}
            </button>
            <button type="button" onClick={() => setRenewing(false)} className={`${linkClass} text-sm`}>
              Annuleren
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setRenewing(true)} className={secondaryButtonClass}>
              Nieuwe link maken
            </button>
            <DeleteButton action={deleteCalendarFeed} label="Link intrekken" confirmText="De link intrekken? Je agenda-app krijgt dan geen updates meer." compact />
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
