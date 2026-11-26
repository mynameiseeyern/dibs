import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { countIn } from "@dibs/shared/plans";
import type { Plan, PlanMember } from "@dibs/shared/types";
import { store } from "@/lib/store";
import { formatShort } from "@/lib/time";
import { previewMeta } from "@/lib/og";
import { crews } from "@/lib/crews";

/**
 * The link preview for a plan, or one of its pages ("Square up: Friday dumplings"). Only what the
 * plan page already shows anyone with the link: title, day and time, place name or area, how many
 * are in. Never an address, a balance or who owes what.
 */
export async function planPreview(slug: string, page?: { label: string; path: string; blurb?: string }): Promise<Metadata> {
  const plan = await store.getPlanBySlug(slug);
  if (!plan) return { title: "Plan not found" };
  // Crew-only: a generic preview. No title, time, place, crew or faces (ARV-89).
  if ((await crews.planCrew(plan)).visibility === "crew") return previewMeta({ title: "A plan on Dibby", description: "For the crew only. Open it in the app.", path: `/p/${slug}${page?.path ?? ""}` });
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
  // The plan's card, on the plan and all its pages. The key changes whenever the card would.
  const image = { url: `/p/${slug}/card?k=${cardKey(plan, members)}`, width: 1200, height: 630, alt: `${plan.title} on Dibby` };
  meta.openGraph = { ...meta.openGraph, images: [image] };
  meta.twitter = { ...meta.twitter, images: [image] };
  return meta;
}

/**
 * A short fingerprint of everything the preview card draws: title, time, place, status, how many
 * are in, and the faces shown. Chat apps cache a preview image by its address, so a new key is
 * what makes them fetch the new card when someone joins or the plan changes.
 */
export function cardKey(plan: Plan, members: PlanMember[]): string {
  const going = members.filter((m) => m.rsvp === "in" && !m.waitlisted);
  const drawn = [
    plan.title,
    plan.starts_at,
    plan.venue_name,
    plan.area,
    plan.status,
    countIn(members),
    going.length,
    going.slice(0, 5).map((m) => [m.id, m.display_name, m.colour]),
  ];
  return createHash("sha256").update(JSON.stringify(drawn)).digest("base64url").slice(0, 12);
}
