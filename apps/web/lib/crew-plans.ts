import "server-only";
import { crewPlanAccess, showCrewOnPlan, suggestCrew, type CrewRole, type CrewSuggestion, type PlanVisibility } from "@dibs/shared/crews";
import type { PlanMember } from "@dibs/shared/types";
import { store } from "./store";
import { crews, type CrewRow } from "./crews";

/**
 * Crew plans (ARV-93): the one check every way into a plan goes through. Crew-only plans are
 * for the crew alone (`crewPlanAccess`): anyone else gets what a plan that doesn't exist gets.
 * Called by loadPlan (the plan page, its actions, the app's plan routes), the app's public plan
 * summary, the guest rejoin page and the link preview and card.
 */
export interface CrewGate {
  see: boolean;
  crewId: string | null;
  visibility: PlanVisibility;
  /** The viewer's role in the plan's crew. */
  crewRole: CrewRole | null;
  /** The crew, when the viewer may see which crew it is (showCrewOnPlan). */
  crew: Pick<CrewRow, "id" | "name" | "emoji"> | null;
}

export async function crewGate(plan: { id: string }, viewer: { userId: string | null; onPlan: boolean }): Promise<CrewGate> {
  const { crewId, visibility } = await crews.planCrew(plan);
  if (!crewId && visibility === "link") return { see: true, crewId: null, visibility, crewRole: null, crew: null };
  const crewRole = crewId && viewer.userId ? await crews.roleIn(crewId, viewer.userId) : null;
  const see = crewPlanAccess({ crewId, visibility }, { crewRole, onPlan: viewer.onPlan }) === "see";
  const row = see && crewId && showCrewOnPlan({ crewId, visibility }, { crewRole }) ? await crews.getCrew(crewId) : null;
  return { see, crewId, visibility, crewRole, crew: row ? { id: row.id, name: row.name, emoji: row.emoji } : null };
}

/**
 * My plans, with each plan's crew (ARV-97), and without crew-only plans you've lost: removed from
 * the crew, you're still on them, but they're not yours to see.
 */
export async function withCrews<T extends { slug: string; crew?: { id: string; name: string; emoji: string } | null }, L extends Record<string, unknown>>(
  userId: string,
  lists: L
): Promise<L> {
  const keys = Object.keys(lists).filter((k) => Array.isArray(lists[k])) as (keyof L)[];
  const all = keys.flatMap((k) => lists[k] as unknown as T[]);
  const bySlug = await crews.crewsBySlug(all.map((r) => r.slug));
  if (bySlug.size === 0) return lists;
  const ids = [...new Set([...bySlug.values()].map((c) => c.crewId).filter((x): x is string => Boolean(x)))];
  const [roles, rows] = await Promise.all([
    Promise.all(ids.map(async (id) => [id, await crews.roleIn(id, userId)] as const)).then((r) => new Map(r)),
    Promise.all(ids.map((id) => crews.getCrew(id))).then((r) => new Map(r.filter((c): c is CrewRow => Boolean(c)).map((c) => [c.id, c]))),
  ]);
  const out = { ...lists };
  for (const k of keys) {
    (out[k] as unknown as T[]) = (lists[k] as unknown as T[]).flatMap((row) => {
      const c = bySlug.get(row.slug);
      if (!c) return [row];
      const crewRole = c.crewId ? (roles.get(c.crewId) ?? null) : null;
      if (crewPlanAccess({ crewId: c.crewId, visibility: c.visibility }, { crewRole, onPlan: true }) === "blocked") return [];
      const crew = c.crewId && showCrewOnPlan({ crewId: c.crewId, visibility: c.visibility }, { crewRole }) ? rows.get(c.crewId) : undefined;
      return [crew ? { ...row, crew: { id: crew.id, name: crew.name, emoji: crew.emoji } } : row];
    });
  }
  return out;
}

/** Drops crew-only plans you're on but no longer allowed to see (removed from the crew). For lists of your plans: web home, calendar feed. */
export async function dropLostCrewPlans<T extends { plan: { id: string; slug: string } }>(userId: string, rows: T[]): Promise<T[]> {
  const bySlug = await crews.crewsBySlug(rows.map((r) => r.plan.slug));
  if (bySlug.size === 0) return rows;
  const ids = [...new Set([...bySlug.values()].map((c) => c.crewId).filter((x): x is string => Boolean(x)))];
  const roles = new Map(await Promise.all(ids.map(async (id) => [id, await crews.roleIn(id, userId)] as const)));
  return rows.filter((r) => {
    const c = bySlug.get(r.plan.slug);
    if (!c) return true;
    return crewPlanAccess({ crewId: c.crewId, visibility: c.visibility }, { crewRole: c.crewId ? (roles.get(c.crewId) ?? null) : null, onPlan: true }) === "see";
  });
}

/** How many of your latest plans to compare against. */
const SUGGEST_LOOKBACK = 20;

/**
 * "Turn this into a crew?" (ARV-96): for a host with an account, on a plan with no crew that isn't
 * called off. People on it who were also on one of your latest plans, unless they're already a crew.
 */
export async function crewSuggestionFor(plan: { id: string; status: string }, members: PlanMember[], hostUserId: string | null, isHost: boolean): Promise<CrewSuggestion | null> {
  if (!isHost || !hostUserId || plan.status === "cancelled") return null;
  if ((await crews.planCrew(plan)).crewId) return null;
  const onThis = members.map((m) => ({ user_id: m.user_id, name: m.display_name, rsvp: m.rsvp }));
  // Cheap check first: without two other accounts on this plan, nothing to suggest.
  if (onThis.filter((m) => m.user_id && m.user_id !== hostUserId && m.rsvp !== "out").length < 2) return null;
  const mine = (await store.listPlansForUser(hostUserId))
    .filter(({ plan: p }) => p.id !== plan.id)
    .sort((a, b) => (b.plan.created_at ?? "").localeCompare(a.plan.created_at ?? ""))
    .slice(0, SUGGEST_LOOKBACK);
  const [others, myCrews] = await Promise.all([
    Promise.all(mine.map(async ({ plan: p }) => (await store.listMembers(p.id)).map((m) => m.user_id))),
    crews.myCrews(hostUserId).then((list) => Promise.all(list.map(async (c) => (await crews.listMembers(c.id)).map((m) => m.user_id)))),
  ]);
  return suggestCrew(onThis, others, myCrews, hostUserId);
}
