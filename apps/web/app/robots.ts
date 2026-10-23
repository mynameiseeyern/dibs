import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Crawlers may read everything, so chat apps can always draw a preview. Plans and personal pages
// stay out of search with a noindex tag instead (the root layout's default).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
