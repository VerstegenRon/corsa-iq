// The agenda as an iCalendar feed, for calendar apps that subscribe to it. They cannot sign in, so the
// private token in the link is the key: the calendar_feed function only answers for a known token.

import { createServerClient } from "@supabase/ssr";

import { buildCalendar, type CalendarEntry } from "@/lib/ical";
import { EVENT_TYPES, labelFor, todayInAmsterdam } from "@/lib/karting";
import { jobSentence, jobTitle, planMaintenance, type PlanEvent, type PlanKart, type PlanPart } from "@/lib/maintenance-plan";
import type { Database } from "@/lib/supabase/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

type Feed = {
  garage: string | null;
  events: (PlanEvent & { type: string; track: { name: string | null; city: string | null } })[];
  items: { id: string; title: string; starts_on: string; ends_on: string | null; starts_at: string | null; notes: string | null }[];
  karts: PlanKart[];
  parts: PlanPart[];
};

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/, "");
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return new Response("Niet gevonden", { status: 404 });

  // No user session: the feed function does the access check with the token.
  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
  const { data, error } = await supabase.rpc("calendar_feed", { feed_token: token });
  if (error) return new Response("Agenda niet beschikbaar", { status: 503 });
  if (!data) return new Response("Niet gevonden", { status: 404 });
  const feed = data as unknown as Feed;

  const origin = new URL(request.url).origin;
  const today = todayInAmsterdam();
  const plan = planMaintenance({ karts: feed.karts, parts: feed.parts, events: feed.events, today });

  const entries: CalendarEntry[] = [
    ...feed.events.map((e) => ({
      uid: `event-${e.id}@corsaiq`,
      summary: e.name,
      description: [labelFor(EVENT_TYPES, e.type), [e.track?.name, e.track?.city].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      url: `${origin}/dashboard/events/${e.id}`,
      date: e.starts_on,
      lastDate: e.ends_on ?? e.starts_on,
    })),
    ...feed.items.map((i) => ({
      uid: `item-${i.id}@corsaiq`,
      summary: i.title,
      description: i.notes,
      url: `${origin}/dashboard/agenda?month=${i.starts_on.slice(0, 7)}`,
      date: i.starts_on,
      lastDate: i.ends_on ?? i.starts_on,
      time: i.starts_at,
    })),
    ...plan.map((job) => ({
      uid: `maintenance-${job.key}@corsaiq`,
      summary: `Onderhoud: ${jobTitle(job)}`,
      description: `${jobSentence(job)}${job.event ? ` Klaar hebben vóór ${job.event.name}.` : ""}`,
      url: `${origin}${job.href}`,
      date: job.dueBy,
    })),
  ];

  return new Response(buildCalendar(feed.garage ? `CorsaIQ · ${feed.garage}` : "CorsaIQ", entries), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="corsaiq.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
