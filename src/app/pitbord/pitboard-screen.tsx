"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { formatGapSeconds, formatLapTime } from "@/lib/karting";
import { createRealtimeClient } from "@/lib/supabase/client";

type BoardLap = {
  lap_number: number;
  lap_time_ms: number;
  position: number | null;
  gap_to_p1_ms: number | null;
  is_pit_lap: boolean;
};
export type BoardSession = {
  id: string;
  label: string;
  plannedLaps: number | null;
  kartName: string;
  referenceMs: number | null;
  laps: BoardLap[];
};

/**
 * Always dark and as large as the screen allows: it is read from a moving kart. The screen is kept
 * awake while the board is open, where the browser allows it.
 */
export function PitboardScreen({
  garageId,
  initialMessage,
  initialSessions,
}: {
  garageId: string;
  initialMessage: { id: string; text: string } | null;
  initialSessions: BoardSession[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState(initialMessage);
  const [sessions, setSessions] = useState(initialSessions);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: {
        request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
      };
    };
    nav.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => void lock?.release();
  }, []);

  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    void createRealtimeClient().then((supabase) => {
      if (cancelled) return;
      const channel = supabase
        .channel(`pitbord:${garageId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pit_messages",
            filter: `garage_id=eq.${garageId}`,
          },
          (payload) => {
            const row = payload.new as { id: string; text: string; cleared_at: string | null } | undefined;
            if (row && !row.cleared_at && payload.eventType === "INSERT") setMessage({ id: row.id, text: row.text });
            else if (row?.cleared_at) setMessage((m) => (m?.id === row.id ? null : m));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "live_laps",
            filter: `garage_id=eq.${garageId}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              router.refresh();
              return;
            }
            const row = payload.new as BoardLap & { live_session_id: string };
            setSessions((ss) =>
              ss.map((s) =>
                s.id === row.live_session_id
                  ? {
                      ...s,
                      laps: [...s.laps.filter((l) => l.lap_number !== row.lap_number), row],
                    }
                  : s,
              ),
            );
          },
        )
        // A session started or closed elsewhere: read the list again.
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "live_sessions",
            filter: `garage_id=eq.${garageId}`,
          },
          () => router.refresh(),
        )
        .subscribe();
      stop = () => void supabase.removeChannel(channel);
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [garageId, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the server sends a new list after a refresh
  useEffect(() => setSessions(initialSessions), [initialSessions]);

  const session = sessions[Math.min(selected, sessions.length - 1)] ?? null;
  const laps = session ? [...session.laps].sort((a, b) => a.lap_number - b.lap_number) : [];
  const last = laps.at(-1) ?? null;
  const delta = last && session?.referenceMs && !last.is_pit_lap ? last.lap_time_ms - session.referenceMs : null;
  const positioned = [...laps].reverse().find((l) => l.position !== null) ?? null;

  return (
    <main className="flex min-h-dvh flex-col bg-[#0a0a0a] px-4 py-4 text-[#fafafa] sm:px-8">
      <div className="flex items-center justify-between gap-3 font-mono text-xs tracking-[0.1em] text-[#a3a3a3] uppercase">
        <span>
          Pitbord
          {session && ` · ${session.kartName}`}
        </span>
        <span className="flex items-center gap-3">
          {sessions.length > 1 &&
            sessions.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(i)}
                className={`min-h-11 border px-3 ${i === selected ? "border-[#d4ff00] text-[#d4ff00]" : "border-[#404040]"}`}
              >
                {s.kartName}
              </button>
            ))}
          <Link href="/dashboard/live" className="min-h-11 content-center border border-[#404040] px-3 hover:border-[#737373]">
            Sluiten
          </Link>
        </span>
      </div>

      <section aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {message ? (
          <p className="font-display text-[clamp(3rem,13vw,11rem)] leading-[0.95] font-black break-words text-[#d4ff00] uppercase">{message.text}</p>
        ) : (
          <p className="font-mono text-sm text-[#737373]">Nog geen bericht. Zet er een op vanuit Live of Analyse.</p>
        )}
      </section>

      {session && (
        <section aria-label="Live" className="grid grid-cols-3 items-end gap-4 border-t border-[#262626] pt-4 font-mono tabular-nums">
          <div>
            <p className="text-xs tracking-[0.1em] text-[#a3a3a3] uppercase">
              Live · {session.label} · R{laps.length}
              {session.plannedLaps ? `/${session.plannedLaps}` : ""}
            </p>
            <p className="text-[clamp(2rem,8vw,5rem)] leading-none font-bold">{positioned?.position ? `P${positioned.position}` : "—"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs tracking-[0.1em] text-[#a3a3a3] uppercase">Laatste</p>
            <p className="text-[clamp(1.5rem,5vw,3.5rem)] leading-none font-bold">{last ? formatLapTime(last.lap_time_ms) : "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-[0.1em] text-[#a3a3a3] uppercase">t.o.v. ref</p>
            <p
              className={`text-[clamp(2rem,8vw,5rem)] leading-none font-bold ${delta === null ? "" : delta < 0 ? "text-[#d4ff00]" : "text-[#ff5a3c]"}`}
            >
              {delta === null ? "—" : formatGapSeconds(delta)}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
