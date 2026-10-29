import { NextResponse } from "next/server";

import { getCurrentGarage } from "@/lib/garage";
import { LOGGER_BUCKET, RECEIPT_BUCKET, TELEMETRY_BUCKET } from "@/lib/storage";
import { listFiles } from "@/lib/storage-files";

// The data export (GDPR): your profile and memberships, and everything you can see in the current
// garage, as one JSON file. Row-level security decides what is in it (no costs for a driver or
// viewer). Invitation links and the calendar subscription hold secret tokens and stay out.

type Supabase = Awaited<ReturnType<typeof getCurrentGarage>>["supabase"];
type Row = Record<string, unknown>;
/** The part of the client used with a table name from a list, which its typing cannot follow. */
type UntypedClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => { range: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }> };
    };
  };
};

/** Tables with their own garage_id. */
const GARAGE_TABLES = [
  "drivers",
  "karts",
  "parts",
  "maintenance_records",
  "gear_items",
  "seasons",
  "events",
  "setups",
  "setup_templates",
  "expenses",
  "checklist_items",
  "event_checklist_items",
  "calendar_items",
  "data_imports",
  "prestart_checks",
  "tyre_pressure_readings",
  "session_checks",
  "live_sessions",
  "live_laps",
  "pit_messages",
  "lap_channels",
  "track_layout_corners",
] as const;

/** Tables that belong to the garage through their parent; the embedded parent is only a filter. */
const CHILD_TABLES: { table: string; select: string; filter: string; drop: string }[] = [
  { table: "sessions", select: "*, events!inner(garage_id)", filter: "events.garage_id", drop: "events" },
  { table: "laps", select: "*, sessions!laps_session_id_fkey!inner(events!inner(garage_id))", filter: "sessions.events.garage_id", drop: "sessions" },
  { table: "lap_sectors", select: "*, laps!inner(sessions!laps_session_id_fkey!inner(events!inner(garage_id)))", filter: "laps.sessions.events.garage_id", drop: "laps" },
  { table: "session_parts", select: "*, sessions!inner(events!inner(garage_id))", filter: "sessions.events.garage_id", drop: "sessions" },
  { table: "part_installations", select: "*, parts!inner(garage_id)", filter: "parts.garage_id", drop: "parts" },
];

const PAGE = 1000;

/** Every row, a thousand at a time (the API's page size). */
async function all(supabase: Supabase, table: string, select: string, column: string, garageId: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await (supabase as unknown as UntypedClient)
      .from(table)
      .select(select)
      .eq(column, garageId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

export async function GET() {
  const { supabase, user, garage, role } = await getCurrentGarage();

  const [profile, memberships, team, tracks] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.rpc("my_account_garages"),
    supabase.rpc("garage_team", { p_garage_id: garage.id }),
    supabase.from("tracks").select("*").eq("created_by_garage_id", garage.id),
  ]);

  const data: Record<string, Row[]> = {};
  for (const table of GARAGE_TABLES) data[table] = await all(supabase, table, "*", "garage_id", garage.id);
  for (const child of CHILD_TABLES) {
    const rows = await all(supabase, child.table, child.select, child.filter, garage.id);
    data[child.table] = rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== child.drop)));
  }
  data.own_tracks = (tracks.data ?? []) as Row[];

  const uploaded = Object.fromEntries(
    await Promise.all([LOGGER_BUCKET, RECEIPT_BUCKET, TELEMETRY_BUCKET].map(async (bucket) => [bucket, await listFiles(supabase, bucket, garage.id)] as const)),
  );

  const exportedAt = new Date().toISOString();
  const body = {
    about: "Export from CorsaIQ: your account and the garage you were working in. Uploaded files are listed by name; download them in the app.",
    exported_at: exportedAt,
    account: { id: user.id, email: user.email, created_at: user.created_at, profile: profile.data, memberships: memberships.data ?? [] },
    garage: { ...garage, your_role: role, members: team.data ?? [] },
    data,
    files: uploaded,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="corsa-iq-export-${exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
