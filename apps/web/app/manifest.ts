import type { MetadataRoute } from "next";
import { OG, SITE_DESCRIPTION, SITE_NAME } from "@/lib/og";

// Add to Home Screen: opens straight to your plans, in Dibby violet.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/home",
    display: "standalone",
    background_color: OG.white,
    theme_color: OG.violet,
    icons: [
      { src: "/dibby/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/dibby/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
