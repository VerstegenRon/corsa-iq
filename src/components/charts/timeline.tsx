// The coming weeks on one line: a track from today with a marker per event or planned job at its
// date, and the same items listed below with how many days away they are.

import Link from "next/link";

export type TimelineItem = {
  key: string;
  date: string;
  /** Last day, for events of several days. */
  until?: string | null;
  label: string;
  detail?: string;
  href: string;
  kind: "event" | "maintenance" | "item";
};

export const TIMELINE_KINDS: Record<TimelineItem["kind"], { label: string; color: string }> = {
  event: { label: "Evenement", color: "var(--color-brand-400)" },
  maintenance: { label: "Onderhoud", color: "var(--chart-4)" },
  item: { label: "Afspraak", color: "var(--chart-7)" },
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";
const monthFormat = new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const utc = (date: string) => new Date(`${date}T12:00:00Z`).getTime();
const DAY = 86_400_000;

export function Timeline({ items, today, days }: { items: TimelineItem[]; today: string; days: number }) {
  const start = utc(today);
  const end = start + days * DAY;
  const at = (date: string) => Math.min(Math.max((utc(date) - start) / (end - start), 0), 1) * 100;
  // Month starts within the range, as ticks on the track.
  const months: { key: string; left: number; label: string }[] = [];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  while (cursor.getTime() < end) {
    const iso = cursor.toISOString().slice(0, 10);
    // A month starting right after today would collide with the "vandaag" label.
    if (at(iso) > 8) months.push({ key: iso, left: at(iso), label: monthFormat.format(cursor) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const shown = items.filter((i) => utc(i.date) >= start - DAY && utc(i.date) <= end).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <div aria-hidden="true" className="relative mx-2 mt-2 mb-7 h-8">
        <div
          className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full opacity-60"
          style={{ background: "var(--color-zinc-700)" }}
        />
        <span className="absolute top-full -left-2 mt-1 text-[11px] font-medium text-zinc-300">vandaag</span>
        {months.map((m) => (
          <span key={m.key} className="absolute top-0 h-full" style={{ left: `${m.left}%` }}>
            <span className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-zinc-600" />
            <span className="absolute top-full mt-1 -translate-x-1/2 text-[11px] text-zinc-500">{m.label}</span>
          </span>
        ))}
        {shown.map((item) => (
          <span
            key={item.key}
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--chart-surface)]"
            style={{ left: `${at(item.date)}%`, background: TIMELINE_KINDS[item.kind].color }}
          />
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-zinc-400">Niets gepland in deze periode.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {shown.slice(0, 6).map((item) => {
            const inDays = Math.round((utc(item.date) - start) / DAY);
            return (
              <li key={item.key}>
                <Link href={item.href} className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-zinc-800/60 ${focusRing}`}>
                  <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: TIMELINE_KINDS[item.kind].color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">{item.label}</span>
                    <span className="block truncate text-xs text-zinc-400">
                      {TIMELINE_KINDS[item.kind].label} · {dayFormat.format(new Date(utc(item.date)))}
                      {item.detail && ` · ${item.detail}`}
                    </span>
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-50 tabular-nums"
                    style={{ background: `color-mix(in oklab, ${TIMELINE_KINDS[item.kind].color} 22%, transparent)` }}
                  >
                    {inDays <= 0 ? "vandaag" : inDays === 1 ? "morgen" : `${inDays} d`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <ul aria-label="Legenda" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        {Object.values(TIMELINE_KINDS).map((kind) => (
          <li key={kind.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: kind.color }} />
            {kind.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
