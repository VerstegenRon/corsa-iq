"use client";

import Link from "next/link";
import { useState } from "react";

import { inputClass } from "@/components/ui";

export type TrackRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  countryName: string;
  own: boolean;
  events: number;
};

/** Tracks grouped per country (A–Z), with a search over name, town and country. */
export function TrackList({ tracks }: { tracks: TrackRow[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q
    ? tracks.filter((t) => [t.name, t.city, t.country, t.countryName].some((v) => v?.toLowerCase().includes(q)))
    : tracks;

  const groups = new Map<string, TrackRow[]>();
  for (const track of visible) groups.set(track.countryName, [...(groups.get(track.countryName) ?? []), track]);

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-2 text-sm text-zinc-300 sm:max-w-sm">
        Zoeken
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Naam, plaats of land"
          className={inputClass}
        />
      </label>

      {visible.length === 0 && <p className="text-sm text-zinc-400">Geen circuit gevonden. Voeg het hieronder zelf toe.</p>}

      {[...groups.entries()].map(([country, rows]) => (
        <section key={country} aria-label={country}>
          <h3 className="text-xs tracking-wide text-zinc-500 uppercase">{country}</h3>
          <ul className="mt-2 divide-y divide-zinc-800/80">
            {rows.map((track) => (
              <li key={track.id}>
                <Link
                  href={`/dashboard/tracks/${track.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                >
                  <span>
                    <span className="text-sm font-medium text-zinc-100">{track.name}</span>
                    {track.city && <span className="text-sm text-zinc-500"> · {track.city}</span>}
                    {track.own && (
                      <span className="ml-2 rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">eigen</span>
                    )}
                  </span>
                  {track.events > 0 && (
                    <span className="text-xs text-zinc-400">
                      {track.events} {track.events === 1 ? "evenement" : "evenementen"}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
