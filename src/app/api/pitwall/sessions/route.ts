// Saves one session queued on the pitwall. JSON only: a cross-site form cannot send that without
// a preflight, so a signed-in browser cannot be made to post sessions from another site.

import { revalidatePath } from "next/cache";

import { insertSession } from "@/app/dashboard/session-save";
import { KEEP_SETUP_FIELDS } from "@/lib/pitwall";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Verwacht JSON." }, { status: 415 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Log opnieuw in om de sessies te versturen." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { id?: unknown; eventId?: unknown; fields?: unknown } | null;
  const fields = body?.fields;
  if (
    !body ||
    typeof body.id !== "string" ||
    !UUID.test(body.id) ||
    typeof body.eventId !== "string" ||
    !fields ||
    typeof fields !== "object"
  ) {
    return Response.json({ error: "Onvolledige sessie." }, { status: 400 });
  }

  // RLS limits events to the user's garages; the event also tells which garage the setup belongs to.
  const { data: event } = await supabase.from("events").select("id, garage_id").eq("id", body.eventId).maybeSingle();
  if (!event) return Response.json({ error: "Dit evenement bestaat niet meer." }, { status: 404 });

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
