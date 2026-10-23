import type { Metadata } from "next";
import { countIn } from "@dibs/shared/plans";
import { store } from "@/lib/store";
import { formatShort } from "@/lib/time";
import { previewMeta } from "@/lib/og";

/**
 * The link preview for a plan, or one of its pages ("Square up: Friday dumplings"). Only what the
 * plan page already shows anyone with the link: title, day and time, place name or area, how many
 * are in. Never an address, a balance or who owes what.
 */
export async function planPreview(slug: string, page?: { label: string; path: string; blurb?: string }): Promise<Metadata> {
  const plan = await store.getPlanBySlug(slug);
  if (!plan) return { title: "Plan not found" };
  const members = await store.listMembers(plan.id);
  const n = countIn(members);
  const when = formatShort(plan.starts_at);
  const voting = plan.status === "voting" && !plan.venue_name;
  const facts = [when, voting ? null : plan.venue_name ?? plan.area].filter(Boolean).join(" · ");
  const call =
    plan.status === "cancelled"
      ? "Called off."
      : plan.status === "wrapped"
        ? `${n} went. See how it went.`
        : `${n === 0 ? "Nobody's in yet" : `${n} in`}.${voting ? " Place is up for a vote." : ""} You in?`;
  const title = page ? `${page.label}: ${plan.title}` : plan.title;
  const meta = previewMeta({ title, description: [facts, page?.blurb ?? call].filter(Boolean).join(" · "), path: `/p/${slug}${page?.path ?? ""}` });
  // A plan's own pages show the plan's card too (Next only attaches it to the plan page itself).
  if (page) {
    const image = { url: `/p/${slug}/opengraph-image`, width: 1200, height: 630, alt: `${plan.title} on dibs` };
    meta.openGraph = { ...meta.openGraph, images: [image] };
    meta.twitter = { ...meta.twitter, images: [image] };
  }
  return meta;
}
