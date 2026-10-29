import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CorsaIQ",
    short_name: "CorsaIQ",
    description: "Je hele kartseizoen in één pitbox, met een pitwall die ook zonder bereik werkt.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Pitwall", short_name: "Pitwall", description: "Snel een sessie loggen", url: "/pitwall" }],
  };
}
