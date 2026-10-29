"use client";

// The last resort when even the root layout fails: report it and offer a way back.

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="nl">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0a", color: "#fafafa", fontFamily: "Arial, sans-serif" }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, textTransform: "uppercase" }}>
            Er ging iets mis<span style={{ color: "#d4ff00" }}>.</span>
          </h1>
          <p style={{ color: "#a3a3a3" }}>De fout is gemeld. Probeer het opnieuw, of ga terug naar Vandaag.</p>
          <p style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button type="button" onClick={reset} style={{ background: "#d4ff00", color: "#0a0a0a", border: 0, padding: "12px 20px", fontWeight: 700 }}>
              Opnieuw proberen
            </button>
            <a href="/dashboard/vandaag" style={{ color: "#fafafa", border: "1px solid #404040", padding: "12px 20px", textDecoration: "none" }}>
              Naar Vandaag
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
