import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Only the home page (the plan form) and About are public. Plans are private-by-link.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl()}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl()}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl()}/app`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
