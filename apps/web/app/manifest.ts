import type { MetadataRoute } from "next";
import { OG, SITE_DESCRIPTION, SITE_NAME } from "@/lib/og";

// Add to Home Screen: opens straight to your plans, in dibs violet.
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
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
