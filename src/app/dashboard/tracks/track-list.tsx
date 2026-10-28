"use client";

import Link from "next/link";
import { useState } from "react";

import { inputClass, labelClass } from "@/components/ui";

export type TrackRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  countryName: string;
  own: boolean;
  events: number;
};

/**
 * Tracks grouped per country (A–Z), with a country picker and a search over name, town and country.
 * On phones the full list is long, so it only shows once a country is picked or something is searched;
 * wider screens show every country until one is picked.
 */
export function TrackList({ tracks }: { tracks: TrackRow[] }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const q = query.trim().toLowerCase();
  const visible = tracks.filter(
    (t) =>
      (!country || t.countryName === country) &&
      (!q || [t.name, t.city, t.country, t.countryName].some((v) => v?.toLowerCase().includes(q))),
  );
  const countries = new Map<string, number>();
  for (const track of tracks) countries.set(track.countryName, (countries.get(track.countryName) ?? 0) + 1);
  const narrowed = Boolean(country || q);

  const groups = new Map<string, TrackRow[]>();
  for (const track of visible) groups.set(track.countryName, [...(groups.get(track.countryName) ?? []), track]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:max-w-2xl sm:grid-cols-2">
        <label className={labelClass}>
          Land
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
            <option value="">Alle landen ({tracks.length})</option>
            {[...countries.entries()].map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Zoeken
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Naam, plaats of land"
            className={inputClass}
          />
        </label>
      </div>

      {!narrowed && <p className="text-sm text-zinc-400 sm:hidden">Kies een land, of zoek op naam of plaats.</p>}

      {visible.length === 0 && <p className="text-sm text-zinc-400">Geen circuit gevonden. Voeg het hieronder zelf toe.</p>}

      {[...groups.entries()].map(([name, rows]) => (
        <section key={name} aria-label={name} className={narrowed ? undefined : "hidden sm:block"}>
          <h3 className="text-xs tracking-wide text-zinc-500 uppercase">{name}</h3>
          <ul className="mt-2 divide-y divide-zinc-800/80">
            {rows.map((track) => (
              <li key={track.id}>
                <Link
                  href={`/dashboard/tracks/${track.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
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
