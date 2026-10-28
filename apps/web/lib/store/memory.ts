import { randomUUID } from "node:crypto";
import { FORMER_MEMBER, makeSlug, pickColour } from "@dibs/shared/plans";
import type { LoggedEvent } from "@dibs/shared/metrics";
import type { Bill, BillShare, Guest, Message, NewMember, NewPlan, Plan, PlanMember, PlanOption, PlanPhoto, PlanTime, Profile, Store, Subscription, TimeVote, Vote, RecapAnswer, Reaction } from "./types";

// In-memory store for local runs without Supabase. Lost on restart.
interface Db {
  profiles: Map<string, Profile>;
  guests: Map<string, Guest & { tokenHash: string; email?: string; email_requested_at?: number }>;
  plans: Map<string, Plan>;
  members: Map<string, PlanMember>;
  options: Map<string, PlanOption>;
  votes: Vote[];
  messages: Message[];
  bills: Map<string, Bill>;
  shares: BillShare[];
  recap: RecapAnswer[];
  nudges: { plan_id: string; kind: string; key: string; at: number }[];
  reactions: (Reaction & { plan_id: string })[];
  lists: { list: string; email: string; userId: string | null; token: string; unsubscribed: boolean; source: string }[];
  events: LoggedEvent[];
  times: PlanTime[];
  photos: { photo: PlanPhoto; bytes: Uint8Array }[];
  timeVotes: (TimeVote & { plan_id: string })[];
}

const g = globalThis as unknown as { __dibsDb?: Db };
const db: Db = (g.__dibsDb ??= {
  profiles: new Map(),
  guests: new Map(),
  plans: new Map(),
  members: new Map(),
  options: new Map(),
  votes: [],
  messages: [],
  bills: new Map(),
  shares: [],
  recap: [],
  nudges: [],
  reactions: [],
  lists: [],
  events: [],
  times: [],
  photos: [],
  timeVotes: [],
});
db.events ??= [];
db.times ??= [];
db.photos ??= [];
db.timeVotes ??= [];
db.nudges ??= [];
db.reactions ??= [];

db.recap ??= [];
db.lists ??= [];

const now = () => new Date().toISOString();

export const memoryStore: Store = {
  kind: "memory",

  async getProfile(userId) {
    return db.profiles.get(userId) ?? null;
  },
  async upsertProfile(p) {
    db.profiles.set(p.user_id, { beta_prompt_answered_at: null, ...db.profiles.get(p.user_id), ...p });
  },
  async setSavedCategories(userId, labels) {
    const p = db.profiles.get(userId);
    if (p) p.plan_categories = labels;
  },
  async answerBetaPrompt(userId) {
    const p = db.profiles.get(userId);
    if (p && !p.beta_prompt_answered_at) p.beta_prompt_answered_at = new Date().toISOString();
  },

  async getGuest(guestId) {
    const g = db.guests.get(guestId);
    return g && !g.removed_at ? g : null;
  },
  async setGuestTokenHash(guestId, hash) {
    const g = db.guests.get(guestId);
    if (g) g.tokenHash = hash;
  },
  async getMember(memberId) {
    return db.members.get(memberId) ?? null;
  },
  async setMemberGuest(memberId, guestId) {
    const m = db.members.get(memberId);
    if (m) m.guest_id = guestId;
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
    await this.removePhotosBy([...db.members.values()].filter((m) => m.guest_id === guestId).map((m) => m.id));
    for (const m of db.members.values()) if (m.guest_id === guestId) db.members.delete(m.id);
  },

  async createPlan(p: NewPlan) {
    const plan: Plan = {
      id: randomUUID(),
      slug: makeSlug(),
      organiser_id: p.organiserUserId,
      title: p.title,
      category: p.category ?? null,
      description: p.description ?? null,
      extras_off: p.extrasOff ?? [],
      area: p.area,
      starts_at: p.startsAt,
      venue_place_id: p.venue?.placeId ?? null,
      venue_name: p.venue?.name ?? null,
          venue_address: p.venue?.address ?? null,
      vibe: p.vibe,
      status: p.venue ? "locked" : "voting",
      vote_deadline: p.venue ? null : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      capacity: 20,
      plus_ones: p.plusOnes,
      version: 1,
      updated_note: null,
      dibby_volume: "normal",
      no_bills: false,
      expires_at: p.startsAt ? new Date(Date.parse(p.startsAt) + 30 * 86400 * 1000).toISOString() : null,
      created_at: now(),
    };
    db.plans.set(plan.id, plan);
    await this.addMember({ planId: plan.id, userId: p.organiserUserId, guestId: p.organiserGuestId ?? null, name: p.organiserName, role: "organiser" });
    const organiser = [...db.members.values()].find((m) => m.plan_id === plan.id)!;
    organiser.rsvp = "in";
    return plan;
  },
  async getPlanById(planId) {
    return db.plans.get(planId) ?? null;
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

  async setGuestEmail(guestId, email) {
    const g = db.guests.get(guestId);
    if (g) Object.assign(g, { email: email.toLowerCase(), email_requested_at: Date.now() });
  },

  async getSubscription(list, who) {
    const row = [...db.lists].reverse().find((r) => r.list === list && ("userId" in who ? r.userId === who.userId : r.token === who.token));
    return row ? ({ email: row.email, token: row.token, subscribed: !row.unsubscribed } satisfies Subscription) : null;
  },

  async subscribe(list, { email, userId, source }) {
    const e = email.toLowerCase();
    let row = db.lists.find((r) => r.list === list && r.email === e);
    if (!row) {
      row = { list, email: e, userId, token: randomUUID().replace(/-/g, ""), unsubscribed: false, source };
      db.lists.push(row);
    }
    Object.assign(row, { userId: userId ?? row.userId, unsubscribed: false, source });
    return { email: row.email, token: row.token, subscribed: true };
  },

  async unsubscribe(list, who) {
    const row = [...db.lists].reverse().find((r) => r.list === list && ("userId" in who ? r.userId === who.userId : r.token === who.token));
    if (!row) return null;
    row.unsubscribed = true;
    return { email: row.email, token: row.token, subscribed: false };
  },

  async claimGuests(userId, email, guestId) {
    const hourAgo = Date.now() - 3600 * 1000;
    const guestIds = new Set<string>(guestId ? [guestId] : []);
    if (email) for (const g of db.guests.values()) if (g.email === email.toLowerCase() && (g.email_requested_at ?? 0) > hourAgo) guestIds.add(g.id);
    const mine = new Set([...db.members.values()].filter((m) => m.user_id === userId).map((m) => m.plan_id));
    let moved = 0;
    for (const m of db.members.values()) {
      if (!m.guest_id || !guestIds.has(m.guest_id) || m.user_id || mine.has(m.plan_id)) continue;
      m.user_id = userId;
      const plan = db.plans.get(m.plan_id);
      if (m.role === "organiser" && plan && !plan.organiser_id) plan.organiser_id = userId;
      mine.add(m.plan_id);
      moved++;
    }
    return moved;
  },

  async listPlansForGuest(guestId) {
    const out: { plan: Plan; member: PlanMember }[] = [];
    for (const m of db.members.values()) {
      if (m.guest_id !== guestId) continue;
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
      plus_one_name: null,
      waitlisted: false,
      attended: null,
      dibby_muted: false,
      chat_seen_at: null,
      joined_at: now(),
    };
    db.members.set(member.id, member);
    return member;
  },
  async updateMember(memberId, patch) {
    const m = db.members.get(memberId);
    if (m) Object.assign(m, patch);
  },

  async updatePlan(planId, patch) {
    const plan = db.plans.get(planId);
    if (!plan) throw new Error("Plan not found");
    Object.assign(plan, patch);
    return plan;
  },

  async listOptions(planId) {
    return [...db.options.values()].filter((o) => o.plan_id === planId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async addOption({ planId, label, placeId, note, addedBy }) {
    const o: PlanOption = { id: randomUUID(), plan_id: planId, kind: "venue", place_id: placeId ?? null, label, note: note ?? null, added_by: addedBy ?? null, created_at: now() };
    db.options.set(o.id, o);
    return o;
  },
  async removeOption(planId, optionId) {
    if (db.options.get(optionId)?.plan_id !== planId) return;
    db.options.delete(optionId);
    db.votes = db.votes.filter((v) => v.option_id !== optionId);
  },
  async listVotes(planId) {
    return db.votes.filter((v) => db.options.get(v.option_id)?.plan_id === planId);
  },
  async removeVote(planId, memberId) {
    db.votes = db.votes.filter((v) => !(v.member_id === memberId && db.options.get(v.option_id)?.plan_id === planId));
  },
  async castVote(planId, optionId, memberId) {
    db.votes = db.votes.filter((v) => !(v.member_id === memberId && db.options.get(v.option_id)?.plan_id === planId));
    db.votes.push({ option_id: optionId, member_id: memberId });
  },

  async listMessages(planId, limit = 100) {
    return db.messages.filter((m) => m.plan_id === planId).slice(-limit);
  },
  async addMessage({ planId, memberId, kind, body, mentionsDibby, auto, template }) {
    const m: Message = { id: randomUUID(), plan_id: planId, member_id: memberId, kind, body, mentions_dibby: Boolean(mentionsDibby), auto: Boolean(auto), template: template ?? null, created_at: now() };
    db.messages.push(m);
    return m;
  },

  async listBills(planId) {
    return [...db.bills.values()].filter((b) => b.plan_id === planId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async createBill(b, shares) {
    const bill: Bill = { ...b, id: randomUUID(), created_at: now(), roulette_entrants: [], roulette_loser_id: null };
    db.bills.set(bill.id, bill);
    await this.replaceShares(bill.id, shares);
    return bill;
  },
  async updateBill(billId, patch) {
    const bill = db.bills.get(billId);
    if (bill) Object.assign(bill, patch);
  },
  async replaceShares(billId, shares) {
    db.shares = db.shares.filter((s) => s.bill_id !== billId);
    for (const s of shares) db.shares.push({ ...s, bill_id: billId, says_paid_at: null, confirmed_at: s.status === "confirmed" ? now() : null });
  },
  async listShares(planId) {
    return db.shares.filter((s) => db.bills.get(s.bill_id)?.plan_id === planId);
  },
  async updateShare(billId, memberId, patch) {
    const s = db.shares.find((x) => x.bill_id === billId && x.member_id === memberId);
    if (s) Object.assign(s, patch);
  },
  async recordSpin() {},
  async listRecap(planId) {
    return db.recap.filter((r) => r.plan_id === planId);
  },
  async saveRecap(a) {
    db.recap = db.recap.filter((r) => !(r.plan_id === a.plan_id && r.member_id === a.member_id));
    db.recap.push(a);
  },

  async listReactions(planId) {
    return db.reactions.filter((r) => r.plan_id === planId).map(({ message_id, member_id, emoji }) => ({ message_id, member_id, emoji }));
  },
  async toggleReaction({ planId, message_id, member_id, emoji }) {
    const i = db.reactions.findIndex((r) => r.message_id === message_id && r.member_id === member_id && r.emoji === emoji);
    if (i >= 0) db.reactions.splice(i, 1);
    else db.reactions.push({ plan_id: planId, message_id, member_id, emoji });
  },

  async claimNudge(planId, kind, key) {
    if (db.nudges.some((n) => n.plan_id === planId && n.kind === kind && n.key === key)) return false;
    db.nudges.push({ plan_id: planId, kind, key, at: Date.now() });
    return true;
  },
  async countNudgesSince(planId, sinceIso) {
    const since = Date.parse(sinceIso);
    return db.nudges.filter((n) => n.plan_id === planId && n.at >= since).length;
  },
  async deleteAccount(userId) {
    await this.removePhotosBy([...db.members.values()].filter((m) => m.user_id === userId).map((m) => m.id));
    for (const m of db.members.values()) if (m.user_id === userId) Object.assign(m, { user_id: null, display_name: FORMER_MEMBER });
    for (const p of db.plans.values()) if (p.organiser_id === userId) p.organiser_id = null;
    db.profiles.delete(userId);
    db.lists = db.lists.filter((l) => l.userId !== userId);
    for (const e of db.events) if (e.userId === userId) e.userId = null;
  },
  async listPhotos(planId) {
    return db.photos.filter((x) => x.photo.plan_id === planId).map((x) => x.photo);
  },
  async addPhoto({ planId, memberId, bytes, width, height, glow }) {
    const photo: PlanPhoto = { id: randomUUID(), plan_id: planId, member_id: memberId, width, height, glow, created_at: now() };
    db.photos.push({ photo, bytes });
    return photo;
  },
  async photoBytes(photo) {
    return db.photos.find((x) => x.photo.id === photo.id)?.bytes ?? null;
  },
  async removePhoto(planId, photoId) {
    db.photos = db.photos.filter((x) => !(x.photo.plan_id === planId && x.photo.id === photoId));
  },
  async removePhotosBy(memberIds) {
    db.photos = db.photos.filter((x) => !memberIds.includes(x.photo.member_id));
  },
  async listTimes(planId) {
    return db.times.filter((t) => t.plan_id === planId);
  },
  async listTimeVotes(planId) {
    return db.timeVotes.filter((v) => v.plan_id === planId).map(({ time_id, member_id }) => ({ time_id, member_id }));
  },
  async addTime(planId, startsAt) {
    if (db.times.some((t) => t.plan_id === planId && Date.parse(t.starts_at) === Date.parse(startsAt))) return;
    db.times.push({ id: randomUUID(), plan_id: planId, starts_at: startsAt });
  },
  async removeTime(planId, timeId) {
    db.times = db.times.filter((t) => !(t.plan_id === planId && t.id === timeId));
    db.timeVotes = db.timeVotes.filter((v) => v.time_id !== timeId);
  },
  async toggleTimeVote(planId, timeId, memberId) {
    if (!db.times.some((t) => t.plan_id === planId && t.id === timeId)) return;
    const had = db.timeVotes.some((v) => v.time_id === timeId && v.member_id === memberId);
    db.timeVotes = db.timeVotes.filter((v) => !(v.time_id === timeId && v.member_id === memberId));
    if (!had) db.timeVotes.push({ plan_id: planId, time_id: timeId, member_id: memberId });
  },
  async removeTimeVotes(planId, memberId) {
    db.timeVotes = db.timeVotes.filter((v) => !(v.plan_id === planId && v.member_id === memberId));
  },
  async clearTimes(planId) {
    db.times = db.times.filter((t) => t.plan_id !== planId);
    db.timeVotes = db.timeVotes.filter((v) => v.plan_id !== planId);
  },
  async logEvent(e) {
    db.events.push({ ...e, at: now() });
  },
  async listEvents(sinceIso) {
    return db.events.filter((e) => e.at >= sinceIso);
  },
};
