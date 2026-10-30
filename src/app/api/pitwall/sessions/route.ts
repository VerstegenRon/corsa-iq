// Saves one session queued on the pitwall. JSON only: a cross-site form cannot send that without
// a preflight, so a signed-in browser cannot be made to post sessions from another site.

import { revalidatePath } from "next/cache";

import { insertSession } from "@/app/dashboard/session-save";
import { format } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/server";
import { EVENT_TYPES } from "@/lib/karting";
import { KEEP_SETUP_FIELDS, type NewEvent } from "@/lib/pitwall";
import { seasonIdForDate } from "@/lib/season-for-date";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const te = (await getDictionary()).pitwall.errors;
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: te.expectJson }, { status: 415 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: te.logInAgain }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    eventId?: unknown;
    fields?: unknown;
    newEvent?: Partial<NewEvent>;
  } | null;
  const fields = body?.fields;
  if (
    !body ||
    typeof body.id !== "string" ||
    !UUID.test(body.id) ||
    typeof body.eventId !== "string" ||
    !fields ||
    typeof fields !== "object"
  ) {
    return Response.json({ error: te.incomplete }, { status: 400 });
  }

  // RLS limits events to the user's garages; the event also tells which garage the setup belongs to.
  let { data: event } = await supabase.from("events").select("id, garage_id").eq("id", body.eventId).maybeSingle();
  if (!event && body.newEvent?.id === body.eventId) {
    const created = await createEvent(supabase, body.newEvent, (fields as Record<string, unknown>).kart_id);
    if ("error" in created) return Response.json({ error: created.error }, { status: 422 });
    event = created.event;
  }
  if (!event) return Response.json({ error: te.eventGone }, { status: 404 });

  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && !KEEP_SETUP_FIELDS.includes(key)) formData.set(key, value);
  }

  const result = await insertSession(supabase, event.garage_id, event.id, formData, {
    id: body.id,
    keepSetupFields: KEEP_SETUP_FIELDS,
  });
  if (!result.id) return Response.json({ error: result.error }, { status: 422 });

  revalidatePath("/dashboard", "layout");
  return Response.json({ id: result.id, warning: result.error });
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Saves an event made on the pitwall, in the garage of the session's kart and the season of its year.
 * The kart, not the garage chosen now: a session can wait on the phone while someone switches garage.
 */
async function createEvent(supabase: Supabase, newEvent: Partial<NewEvent>, kartId: unknown) {
  const te = (await getDictionary()).pitwall.errors;
  const { id, name, type, track_id: trackId, starts_on: startsOn } = newEvent;
  if (!id || !UUID.test(id) || !name?.trim() || !type || !(type in EVENT_TYPES) || !trackId || !startsOn || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) {
    return { error: te.newEventIncomplete };
  }
  const { data: kart } = typeof kartId === "string" && UUID.test(kartId) ? await supabase.from("karts").select("garage_id").eq("id", kartId).maybeSingle() : { data: null };
  if (!kart) return { error: te.noGarage };

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      id,
      garage_id: kart.garage_id,
      season_id: await seasonIdForDate(supabase, kart.garage_id, startsOn),
      name: name.trim().slice(0, 120),
      type,
      track_id: trackId,
      starts_on: startsOn,
    })
    .select("id, garage_id")
    .single();
  if (error) return { error: format(te.eventFailed, { error: error.message }) };
  return { event };
}
