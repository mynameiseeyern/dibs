import "server-only";
import type { Vibe } from "@dibs/shared/types";
import { resolveStart } from "@dibs/shared/when";
import { cleanCategory, cleanCustomPlace } from "@dibs/shared/plans";
import { draftPlan, type DraftPicks } from "./dibby";
import { withPlaces } from "./place-ids";
import { getPlace } from "./places";
import { report } from "./report";
import { store } from "./store";
import { localToIso } from "./time";

/**
 * Making a plan from the phone (`POST /api/v1/plans`). The same rules as the web's `createPlan`
 * action in `app/actions.ts`: change one, change the other. Kept apart so the web form's
 * FormData, cookies and redirects stay as they are.
 *
 * The app sends a place typed in (name + optional address) or one picked from the map (place_id,
 * checked with Google here, like the web's picker).
 */

export interface NewPlanInput {
  title: string;
  category: string | null;
  /** "2026-11-14" and "19:00", Sydney wall clock. Fixed facts, like the web's chips. */
  date: string | null;
  time: string | null;
  where: "vote" | "place" | "dibby";
  place: { name: string; address: string | null } | null;
  /** A business picked from the map; wins over a typed-in place. Checked with getPlace when the plan's made. */
  placeId: string | null;
  /** What to ask Dibby for ("dumplings near Chatswood"), and the budget, 1 to 3. */
  ask: string;
  spend: 1 | 2 | 3 | null;
  /** Said yes to sending this to Anthropic. The app asks first (Apple 5.1.2(i)). */
  aiConsent: boolean;
  /** Where the organiser is, rounded, for Dibby to search near (only a bias; never saved or sent to the AI). */
  near: { lat: number; lng: number } | null;
  /** "Roughly where?" for a vote, like the web form's area field. */
  area: string | null;
}

export type Host = { organiserName: string; organiserUserId: string | null; organiserGuestId: string | null };

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** `{ lat, lng }` from the app, rounded to ~100m like the web's locate(). Anything else: null. */
export function readCoords(v: unknown): { lat: number; lng: number } | null {
  if (!v || typeof v !== "object") return null;
  const { lat, lng } = v as { lat?: unknown; lng?: unknown };
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 };
}

export function readNewPlan(body: Record<string, unknown>): NewPlanInput {
  const date = clip(body.date, 10);
  const time = clip(body.time, 5);
  const where = body.where === "place" || body.where === "dibby" ? body.where : "vote";
  const p = body.place && typeof body.place === "object" ? (body.place as Record<string, unknown>) : null;
  const custom = p ? cleanCustomPlace(p.name, p.address) : null;
  const spend = Number(body.spend);
  return {
    title: clip(body.title, 80),
    category: cleanCategory(body.category),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null,
    where,
    place: custom ? { name: custom.name, address: custom.address } : null,
    placeId: p && typeof p.place_id === "string" && /^[\w:-]{1,300}$/.test(p.place_id) ? p.place_id : null,
    ask: clip(body.ask, 500).replace(/^@dibby\s*/i, ""),
    spend: spend === 1 || spend === 2 || spend === 3 ? spend : null,
    aiConsent: body.ai_consent === true,
    near: readCoords(body.near),
    area: clip(body.area, 80) || null,
  };
}

/** What's wrong with it before anyone's made, so a new guest isn't created for a plan that fails. */
export function checkNewPlan(p: NewPlanInput): { error: string; field: string } | null {
  if (p.where === "dibby") {
    if (!p.aiConsent) return { error: "Dibby needs your OK before it can look. Type the place in, or let the crew vote.", field: "where" };
    if (!p.ask && !p.spend) return { error: "Tell Dibby what you're after, like “dumplings” or “bowling”.", field: "ask" };
    if (!process.env.ANTHROPIC_API_KEY) return { error: "Dibby can't find places just yet. Type the place in, or let the crew vote.", field: "where" };
    return null;
  }
  if (!p.title) return { error: "Give it a name, like “Friday dinner”.", field: "title" };
  if (p.where === "place" && !p.place && !p.placeId) return { error: "Pick the place, or let the crew vote on it.", field: "place" };
  return null;
}

/** Makes the plan. Returns its slug, or an error that's fine to show. */
export async function makePlan(p: NewPlanInput, host: Host): Promise<{ slug: string } | { error: string; field?: string }> {
  const vibe: Vibe = "chill";
  const picks: DraftPicks = { date: p.date, time: p.time, spend: p.spend, near: p.near };
  const startLocal = resolveStart(null, picks);
  const startsAt = startLocal ? localToIso(startLocal) : null;
  const base = { ...host, category: p.category, description: null, extrasOff: [], vibe, plusOnes: true };

  if (p.where === "dibby") {
    let draft;
    try {
      draft = await draftPlan([p.title, p.ask].filter(Boolean).join(": "), vibe, picks);
    } catch (e) {
      report("dibby draft (app)", e);
      return { error: "brb, Dibby's having a moment. Try again, or let the crew vote." };
    }
    const plan = await store.createPlan({
      ...base,
      title: p.title || draft.title,
      area: p.area || draft.area,
      startsAt: startsAt ?? (draft.startsAtLocal ? localToIso(draft.startsAtLocal) : null),
    });
    for (const v of draft.venues) await store.addOption({ planId: plan.id, label: v.name, placeId: v.placeId, note: v.address });
    const organiser = (await store.listMembers(plan.id)).find((m) => m.role === "organiser") ?? null;
    await store.addMessage({ planId: plan.id, memberId: organiser?.id ?? null, kind: "text", body: `@dibby ${p.ask}`.trim(), mentionsDibby: true });
    await store.addMessage({
      planId: plan.id,
      memberId: null,
      kind: "system",
      body: "Heads up: when you tag @dibby, your message and the last 20 in this chat go to Anthropic, the AI company behind Dibby, so it can reply. Dibby doesn't do anything until it's tagged.",
    });
    const tail = draft.venues.length ? "Vote's open for 24 hours." : "Couldn't find spots for that on Maps, so add a few and the vote opens.";
    await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: `${draft.reply} ${tail}`, template: withPlaces(null, draft.venues.map((v) => v.placeId)) });
    return { slug: plan.slug };
  }

  let venue: { placeId: string | null; name: string; address: string | null } | null = null;
  if (p.where === "place" && p.placeId) {
    // From the map: Google's name for it, never what the phone sent (the web's setPlace does the same).
    const place = await getPlace(p.placeId);
    if (!place) return { error: "Couldn't find that place. Pick it again, or type it in.", field: "place" };
    venue = { placeId: place.placeId, name: place.name, address: null };
  } else if (p.where === "place" && p.place) venue = { placeId: null, name: p.place.name, address: p.place.address };
  // Same as the web form: an area only when there's no set place.
  const plan = await store.createPlan({ ...base, title: p.title, area: venue ? null : p.area, startsAt, venue });
  return { slug: plan.slug };
}
