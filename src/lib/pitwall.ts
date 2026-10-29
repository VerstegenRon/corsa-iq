// The pitwall logs sessions on the phone first and sends them when there is signal: paddocks often
// have none. Shared by the pitwall screen (queue) and the route handler that saves a queued session.

import { SETUP_FIELDS } from "@/lib/setup";

/** Setup fields the pitwall shows; every other setup field keeps the kart's previous value. */
export const PITWALL_SETUP_FIELDS = SETUP_FIELDS.filter((field) => field.group === "tyres" || field.group === "gearing");

export const KEEP_SETUP_FIELDS = [
  ...SETUP_FIELDS.filter((field) => !PITWALL_SETUP_FIELDS.includes(field)).map((field) => field.name),
  "setup_notes",
];

/** An event made on the pitwall. It is saved with its first session, so it also works offline. */
export type NewEvent = { id: string; name: string; type: string; track_id: string; starts_on: string };

export type QueuedSession = {
  /** Also the session id, so sending it twice saves it once. */
  id: string;
  eventId: string;
  /** For the queue list: "Training · Kart 1 · 14:20". */
  label: string;
  fields: Record<string, string>;
  /** Set when the session belongs to an event made on the pitwall that may not be saved yet. */
  newEvent?: NewEvent;
  queuedAt: string;
  /** Set when the server refused it (for example a wrong value); it is not sent again by itself. */
  error?: string;
};

export const PITWALL_QUEUE_KEY = "corsaiq.pitwall.queue";
/** Events made on the pitwall, kept until the page loads them from the server. */
export const PITWALL_EVENTS_KEY = "corsaiq.pitwall.events";
