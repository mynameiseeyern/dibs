import { randomUUID } from "node:crypto";
import { makeSlug, pickColour } from "@dibs/shared/plans";
import type { Guest, NewMember, NewPlan, Plan, PlanMember, Profile, Store } from "./types";

// In-memory store for local runs without Supabase. Lost on restart.
interface Db {
  profiles: Map<string, Profile>;
  guests: Map<string, Guest & { tokenHash: string }>;
  plans: Map<string, Plan>;
  members: Map<string, PlanMember>;
}

const g = globalThis as unknown as { __dibsDb?: Db };
const db: Db = (g.__dibsDb ??= { profiles: new Map(), guests: new Map(), plans: new Map(), members: new Map() });

const now = () => new Date().toISOString();

export const memoryStore: Store = {
  kind: "memory",

  async getProfile(userId) {
    return db.profiles.get(userId) ?? null;
  },
  async upsertProfile(p) {
    db.profiles.set(p.user_id, p);
  },

  async findGuestByTokenHash(hash) {
    for (const guest of db.guests.values()) if (guest.tokenHash === hash && !guest.removed_at) return guest;
    return null;
  },
  async createGuest({ first_name, last_name, tokenHash }) {
    const guest = { id: randomUUID(), first_name, last_name, removed_at: null, tokenHash };
    db.guests.set(guest.id, guest);
    return guest;
  },
  async removeGuest(guestId) {
    const guest = db.guests.get(guestId);
    if (guest) guest.removed_at = now();
    for (const m of db.members.values()) if (m.guest_id === guestId) db.members.delete(m.id);
  },

  async createPlan(p: NewPlan) {
    const plan: Plan = {
      id: randomUUID(),
      slug: makeSlug(),
      organiser_id: p.organiserUserId,
      title: p.title,
      area: p.area,
      starts_at: p.startsAt,
      venue_place_id: null,
      venue_name: null,
      vibe: p.vibe,
      status: "voting",
      vote_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      capacity: 20,
      plus_ones: p.plusOnes,
      version: 1,
      updated_note: null,
      expires_at: p.startsAt ? new Date(Date.parse(p.startsAt) + 30 * 86400 * 1000).toISOString() : null,
      created_at: now(),
    };
    db.plans.set(plan.id, plan);
    await this.addMember({ planId: plan.id, userId: p.organiserUserId, name: p.organiserName, role: "organiser" });
    const organiser = [...db.members.values()].find((m) => m.plan_id === plan.id)!;
    organiser.rsvp = "in";
    return plan;
  },
  async getPlanBySlug(slug) {
    for (const p of db.plans.values()) if (p.slug === slug) return p;
    return null;
  },
  async listPlansForUser(userId) {
    const out: { plan: Plan; member: PlanMember }[] = [];
    for (const m of db.members.values()) {
      if (m.user_id !== userId) continue;
      const plan = db.plans.get(m.plan_id);
      if (plan) out.push({ plan, member: m });
    }
    return out.sort((a, b) => (a.plan.starts_at ?? a.plan.created_at).localeCompare(b.plan.starts_at ?? b.plan.created_at));
  },

  async listMembers(planId) {
    return [...db.members.values()].filter((m) => m.plan_id === planId).sort((a, b) => a.joined_at.localeCompare(b.joined_at));
  },
  async addMember(m: NewMember) {
    const existing = await this.listMembers(m.planId);
    const member: PlanMember = {
      id: randomUUID(),
      plan_id: m.planId,
      user_id: m.userId ?? null,
      guest_id: m.guestId ?? null,
      role: m.role,
      display_name: m.name,
      colour: pickColour(m.name, existing),
      rsvp: null,
      plus_one: false,
      waitlisted: false,
      attended: null,
      joined_at: now(),
    };
    db.members.set(member.id, member);
    return member;
  },
  async updateMember(memberId, patch) {
    const m = db.members.get(memberId);
    if (m) Object.assign(m, patch);
  },
};
