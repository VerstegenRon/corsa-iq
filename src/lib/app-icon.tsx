import { ImageResponse } from "next/og";

/** The home-screen icon: the brand red with "CIQ", kept inside the maskable safe zone. */
export function appIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#dc2626",
          color: "#ffffff",
          fontSize: size * 0.34,
          fontWeight: 800,
          letterSpacing: -size * 0.01,
        }}
      >
        CIQ
      </div>
    ),
    { width: size, height: size },
  );
}
