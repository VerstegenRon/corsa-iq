import { getCurrentGarage } from "@/lib/garage";

// A deliberate error, to check that error tracking reaches Sentry. Only for the owner of a garage.
export async function GET() {
  const { canManageTeam } = await getCurrentGarage();
  if (!canManageTeam) return new Response("Niet toegestaan.", { status: 403 });
  throw new Error("Corsa IQ: testfout voor Sentry");
}
