import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** Landing point for the email confirmation link. Handles both PKCE codes and token hashes. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = searchParams.get("next") ?? "/dashboard";
  // Only allow same-site relative redirects.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing confirmation parameters") };

  const target = request.nextUrl.clone();
  target.search = "";
  target.pathname = error ? "/login" : safeNext;
  // A `code` only reaches us after Supabase has verified the email. Exchanging it fails when the
  // link is opened in another browser (no PKCE verifier cookie), but the address is confirmed.
  if (error) target.searchParams.set(code ? "confirmed" : "error", code ? "1" : "confirm");

  return NextResponse.redirect(target);
}
