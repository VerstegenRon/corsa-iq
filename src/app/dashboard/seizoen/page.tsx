import type { Metadata } from "next";
import Link from "next/link";

import { LIFE_STATE, LifeBar, lifeState } from "@/components/life-bar";
import { cardClass, linkClass } from "@/components/ui";
import { getCurrentGarage } from "@/lib/garage";
import { getDictionary } from "@/lib/i18n/server";
import {
  CHASSIS_COMPONENTS,
  ENGINE_COMPONENTS,
  formatGapSeconds,
  formatHoursMinutes,
  labelFor,
  ownOrOfficial,
  todayInAmsterdam,
} from "@/lib/karting";
import { computeUsage } from "@/lib/part-usage";

export const metadata: Metadata = {
  title: "Seizoen & materiaal — Corsa IQ",
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";
const dayMonth = new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short", timeZone: "UTC" });
const shortDate = (date: string) =>
  dayMonth
    .format(new Date(`${date}T12:00:00Z`))
    .replace(".", "")
    .toUpperCase();

/** The track atlas: longitude −10…24 and latitude 36…64 on a 680×560 plane. */
const project = (lat: number, lng: number) => ({ x: (lng + 10) * 20, y: (64 - lat) * 20 });
const inAtlas = ({ x, y }: { x: number; y: number }) => x >= 0 && x <= 680 && y >= 0 && y <= 560;

export default async function SeasonPage({ searchParams }: PageProps<"/dashboard/seizoen">) {
  const query = await searchParams;
  const [{ supabase, garage, canEdit }, t] = await Promise.all([getCurrentGarage(), getDictionary()]);
  const today = todayInAmsterdam();

  const { data: seasons } = await supabase.from("seasons").select("id, name, year").eq("garage_id", garage.id).order("year", { ascending: false });
  const season = seasons?.find((s) => s.id === query.season) ?? seasons?.[0] ?? null;

  const [eventsResult, tracksResult, kartsResult, partsResult] = await Promise.all([
    season
      ? supabase
          .from("events")
          .select("id, name, type, starts_on, result_position, pole_lap_ms, tracks(id, name, city), sessions(best_lap_ms, duration_s)")
          .eq("garage_id", garage.id)
          .eq("season_id", season.id)
          .order("starts_on")
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("tracks").select("id, name, city, latitude, longitude").or(ownOrOfficial(garage.id)),
    supabase
      .from("karts")
      .select("id, name, class, usage_limit_minutes, sessions(started_at, duration_s), maintenance_records(performed_on, resets_usage, components)")
      .eq("garage_id", garage.id)
      .in("status", ["active", "spare"]),
    supabase
      .from("parts")
      .select(
        "id, category, brand, model, status, usage_limit_minutes, part_installations(removed_at, karts(name)), session_parts(sessions(started_at, duration_s)), maintenance_records(performed_on, resets_usage, components)",
      )
      .eq("garage_id", garage.id)
      .in("status", ["installed", "in_stock"])
      .not("usage_limit_minutes", "is", null),
  ]);

  const events = (eventsResult.data ?? []).map((e) => {
    const laps = e.sessions.map((s) => s.best_lap_ms).filter((ms): ms is number => ms !== null);
    const best = laps.length > 0 ? Math.min(...laps) : null;
    return { ...e, best, driven: e.starts_on <= today, gap: best !== null && e.pole_lap_ms ? best - e.pole_lap_ms : null };
  });
  const driven = events.filter((e) => e.driven);
  const races = driven.filter((e) => e.type === "race");
  const positions = races.map((e) => e.result_position).filter((p): p is number => p !== null);
  const gaps = races.map((e) => e.gap).filter((g): g is number => g !== null);
  const minutes = events.reduce((sum, e) => sum + e.sessions.reduce((s, x) => s + (x.duration_s ?? 0), 0) / 60, 0);
  const next = events.find((e) => !e.driven);

  // ---- The atlas: every circuit with coordinates; this season's in volt, the next one ringed.
  const visited = new Set(driven.map((e) => e.tracks?.id));
  const tracks = (tracksResult.data ?? [])
    .filter((tr) => tr.latitude !== null && tr.longitude !== null)
    .map((tr) => ({ ...tr, ...project(tr.latitude!, tr.longitude!) }))
    .filter(inAtlas);
  const byId = new Map(tracks.map((tr) => [tr.id, tr]));
  const route = [...driven, ...(next ? [next] : [])]
    .map((e) => (e.tracks ? byId.get(e.tracks.id) : undefined))
    .filter((tr): tr is (typeof tracks)[number] => Boolean(tr));
  const nextTrack = next?.tracks ? byId.get(next.tracks.id) : undefined;
  // Labels for this season's circuits; nearby ones (Genk, Venray, Valkenswaard) would overlap, so
  // each label takes the first of four spots around its dot that is still free.
  const placed: { x: number; y: number; w: number }[] = [];
  const labelled = [...new Map(route.map((tr) => [tr.id, tr])).values()].map((tr) => {
    const text = `${(tr.city ?? tr.name).toUpperCase()}${tr.id === nextTrack?.id && next ? ` · ${shortDate(next.starts_on)}` : ""}`;
    const w = text.length * 6.2;
    const spots = [
      { x: tr.x + 10, y: tr.y - 6, anchor: "start" as const },
      { x: tr.x + 10, y: tr.y + 14, anchor: "start" as const },
      { x: tr.x - 10, y: tr.y - 6, anchor: "end" as const },
      { x: tr.x - 10, y: tr.y + 14, anchor: "end" as const },
    ];
    const free = (s: (typeof spots)[number]) => {
      const left = s.anchor === "start" ? s.x : s.x - w;
      return placed.every((p) => left + w < p.x || left > p.x + p.w || s.y < p.y - 12 || s.y - 12 > p.y);
    };
    const spot = spots.find(free) ?? spots[0];
    placed.push({ x: spot.anchor === "start" ? spot.x : spot.x - w, y: spot.y, w });
    return { id: tr.id, text, ...spot };
  });

  // ---- Material: every kart and part with a limit, used since its last reset.
  const chassisKeys = Object.keys(CHASSIS_COMPONENTS);
  const engineKeys = Object.keys(ENGINE_COMPONENTS);
  const material = [
    ...(kartsResult.data ?? [])
      .filter((k) => k.usage_limit_minutes)
      .map((k) => ({
        key: `kart-${k.id}`,
        href: `/dashboard/karts/${k.id}`,
        name: k.name,
        sub: [k.class, "chassis, frame en lagers"].filter(Boolean).join(" · "),
        used: computeUsage(k.sessions, k.maintenance_records, chassisKeys).sinceResetMinutes,
        limit: k.usage_limit_minutes!,
      })),
    ...(partsResult.data ?? []).map((p) => {
      const sessions = p.session_parts.flatMap((sp) => (sp.sessions ? [sp.sessions] : []));
      const fitted = p.part_installations.find((i) => i.removed_at === null)?.karts?.name;
      return {
        key: `part-${p.id}`,
        href: `/dashboard/parts/${p.id}`,
        name: [p.brand === "TEST" ? null : p.brand, p.model].filter(Boolean).join(" ") || labelFor(t.options.partCategories, p.category),
        sub: [labelFor(t.options.partCategories, p.category), fitted ?? (p.status === "in_stock" ? "reserve" : null)].filter(Boolean).join(" · "),
        used: computeUsage(sessions, p.maintenance_records, p.category === "engine" ? engineKeys : []).sinceResetMinutes,
        limit: p.usage_limit_minutes!,
      };
    }),
  ].sort((a, b) => b.used / b.limit - a.used / a.limit);

  const figures = [
    { label: "Races", value: String(races.length), highlight: false },
    { label: "Beste", value: positions.length > 0 ? `P${Math.min(...positions)}` : "—", highlight: positions.length > 0 },
    { label: "Gem. op pole", value: gaps.length > 0 ? formatGapSeconds(gaps.reduce((a, b) => a + b, 0) / gaps.length) : "—", highlight: false },
    { label: "Gereden", value: formatHoursMinutes(minutes), highlight: false },
  ];

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="channel-label mb-2">Seizoen &amp; materiaal{season ? ` · ${season.name}` : ""}</p>
          <h1 className="text-4xl sm:text-6xl">
            Seizoen
            <br />
            {season?.year ?? today.slice(0, 4)}
            <span className="text-brand-400">.</span>
          </h1>
        </div>
        <div className="grid max-w-3xl min-w-0 flex-[1_1_560px] grid-cols-2 gap-px border border-zinc-800 bg-zinc-800 sm:grid-cols-4">
          {figures.map((f) => (
            <div key={f.label} className={`p-4 ${f.highlight ? "bg-brand-500 text-on-brand" : "bg-zinc-950"}`}>
              <p className={`font-mono text-[11px] tracking-[0.08em] uppercase ${f.highlight ? "" : "text-zinc-500"}`}>{f.label}</p>
              <p className="mt-1 font-mono text-3xl font-bold">{f.value}</p>
            </div>
          ))}
        </div>
      </section>

      {seasons && seasons.length > 1 && (
        <nav aria-label="Seizoen" className="flex flex-wrap gap-1">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/seizoen?season=${s.id}`}
              aria-current={s.id === season?.id ? "page" : undefined}
              className={`inline-flex min-h-11 items-center border px-3 text-sm ${focusRing} ${
                s.id === season?.id ? "border-brand-400 bg-brand-500 font-bold text-on-brand" : "border-zinc-800 text-zinc-300"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </nav>
      )}

      {!season ? (
        <section className={cardClass}>
          <p className="text-zinc-300">Nog geen seizoen.{canEdit && " Maak er een aan om je kalender en uitslagen hier te zien."}</p>
          {canEdit && (
            <Link href="/dashboard/seasons#add-season" className={`${linkClass} mt-3 inline-block text-sm`}>
              Seizoen toevoegen
            </Link>
          )}
        </section>
      ) : (
        <div className="flex flex-wrap items-stretch gap-5">
          <section aria-labelledby="atlas-heading" className="crop min-w-0 flex-[1_1_560px] border border-zinc-800 p-4 sm:p-5">
            <div className="channel-label flex flex-wrap justify-between gap-2">
              <h2 id="atlas-heading">Banenatlas · {tracks.length} banen in de database</h2>
              <span>
                <span className="text-brand-400">●</span> dit seizoen · ○ nog niet
              </span>
            </div>
            <svg
              role="img"
              aria-label={`Kaart met ${tracks.length} kartbanen in Europa, waarvan ${visited.size} dit seizoen bezocht${nextTrack ? ` en ${nextTrack.name} gepland` : ""}`}
              viewBox="0 0 680 560"
              className="mt-3 block h-auto w-full"
            >
              <g stroke="var(--color-zinc-800)" strokeOpacity=".6" strokeWidth="1">
                {[80, 180, 280, 380, 480].map((y) => (
                  <line key={y} x1="0" y1={y} x2="680" y2={y} />
                ))}
                {[100, 200, 300, 400, 500, 600].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="560" />
                ))}
              </g>
              <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-zinc-600)">
                <text x="4" y="76">
                  60°N
                </text>
                <text x="4" y="276">
                  50°N
                </text>
                <text x="4" y="476">
                  40°N
                </text>
                <text x="304" y="554">
                  5°O
                </text>
                <text x="504" y="554">
                  15°O
                </text>
              </g>
              {route.length > 1 && (
                <polyline
                  points={route.map((tr) => `${tr.x.toFixed(1)},${tr.y.toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke="var(--color-brand-400)"
                  strokeOpacity=".4"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
              )}
              <g fill="none" stroke="var(--color-zinc-600)" strokeWidth="1.2">
                {tracks
                  .filter((tr) => !visited.has(tr.id) && tr.id !== nextTrack?.id)
                  .map((tr) => (
                    <circle key={tr.id} cx={tr.x} cy={tr.y} r="3.5">
                      <title>{tr.name}</title>
                    </circle>
                  ))}
              </g>
              <g fill="var(--color-brand-400)">
                {tracks
                  .filter((tr) => visited.has(tr.id))
                  .map((tr) => (
                    <circle key={tr.id} cx={tr.x} cy={tr.y} r="5.5">
                      <title>{tr.name}</title>
                    </circle>
                  ))}
              </g>
              {nextTrack && (
                <g>
                  <circle cx={nextTrack.x} cy={nextTrack.y} r="9" fill="none" stroke="var(--color-brand-400)" strokeWidth="1.5" />
                  <circle cx={nextTrack.x} cy={nextTrack.y} r="4" fill="var(--color-brand-400)" />
                </g>
              )}
              <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--color-zinc-50)">
                {labelled.map((label) => (
                  <text key={label.id} x={label.x} y={label.y} textAnchor={label.anchor}>
                    {label.text}
                  </text>
                ))}
              </g>
            </svg>
          </section>

          <section aria-labelledby="calendar-heading" className="flex min-w-0 flex-[1_1_440px] flex-col border border-zinc-800">
            <div className="channel-label flex justify-between border-b border-zinc-800 px-4 py-3">
              <h2 id="calendar-heading">Kalender &amp; uitslag</h2>
              <span>Op pole</span>
            </div>
            <div className="overflow-x-auto">
              {events.length === 0 ? (
                <p className="px-4 py-4 text-sm text-zinc-400">Nog geen evenementen in dit seizoen.</p>
              ) : (
                <ul className="min-w-[380px]">
                  {events.map((e) => {
                    const pos = e.result_position;
                    return (
                      <li key={e.id} className="border-b border-zinc-800/60 last:border-b-0">
                        <Link
                          href={`/dashboard/events/${e.id}`}
                          className={`grid min-h-[52px] grid-cols-[62px_1fr_56px_74px] items-center gap-2.5 px-4 transition-colors hover:bg-zinc-900 ${focusRing}`}
                        >
                          <span className="font-mono text-[13px] text-zinc-500">{shortDate(e.starts_on)}</span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{e.tracks?.name ?? e.name}</span>
                            <span className="block text-xs text-zinc-500">
                              {labelFor(t.options.eventTypes, e.type)}
                              {!e.driven && " · gepland"}
                            </span>
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-center font-mono text-[15px] font-bold ${
                              pos === 1 ? "bg-brand-500 text-on-brand" : pos !== null && pos <= 3 ? "bg-zinc-50 text-zinc-950" : ""
                            }`}
                          >
                            {pos !== null ? `P${pos}` : "—"}
                          </span>
                          <span className={`text-right font-mono text-[13px] ${e.gap !== null && e.gap <= 0 ? "text-brand-300" : "text-zinc-400"}`}>
                            {e.gap === null ? "—" : e.gap <= 0 ? "pole" : formatGapSeconds(e.gap)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}

      <section aria-labelledby="material-heading" className="border border-zinc-800">
        <div className="channel-label flex flex-wrap justify-between gap-2 border-b border-zinc-800 px-4 py-3">
          <h2 id="material-heading">Materiaal · uren tegen limiet</h2>
          <span>Balk = gebruikt · streep = limiet</span>
        </div>
        {material.length === 0 ? (
          <p className="px-4 py-4 text-sm text-zinc-400">
            Stel bij je karts en onderdelen een limiet in om hier te zien hoeveel ze nog mee kunnen.{" "}
            <Link href="/dashboard/parts" className={linkClass}>
              Naar onderdelen
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <ul className="min-w-[640px]">
              {material.map((m) => {
                const share = m.used / m.limit;
                const state = lifeState(share);
                return (
                  <li key={m.key} className="border-b border-zinc-800/60 last:border-b-0">
                    <Link
                      href={m.href}
                      className={`grid min-h-14 grid-cols-[minmax(160px,1.2fr)_minmax(180px,3fr)_110px_110px] items-center gap-4 px-4 transition-colors hover:bg-zinc-900 ${focusRing}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{m.name}</span>
                        <span className="block truncate text-xs text-zinc-500">{m.sub}</span>
                      </span>
                      <LifeBar share={share} label={m.name} />
                      <span className="text-right font-mono text-sm">
                        {formatHoursMinutes(m.used)} / {formatHoursMinutes(m.limit)}
                      </span>
                      <span className="text-right text-[13px] font-bold" style={{ color: LIFE_STATE[state].color }}>
                        {state !== "ok" && <span aria-hidden="true">{state === "over" ? "! " : "▲ "}</span>}
                        {LIFE_STATE[state].label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
