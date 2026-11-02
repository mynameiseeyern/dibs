import { randomBytes } from "node:crypto";
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FORMER_MEMBER, makeSlug, pickColour } from "@dibs/shared/plans";
import type { LoggedEvent } from "@dibs/shared/metrics";
import { MULTI_VOTES, overLimit } from "@dibs/shared/votes";
import type { Bill, BillShare, Message, NewMember, NewPlan, Plan, PlanMember, PlanOption, PlanPhoto, PlanTime, Store, Subscription, TimeVote, Vote, RecapAnswer, Reaction } from "./types";

const PHOTO_BUCKET = "plan-photos";

// Server-side Supabase store using the service key. Every caller checks access first
// (lib/viewer.ts); row-level security still protects anything the browser reads directly.
let client: SupabaseClient | null = null;
function admin(): SupabaseClient {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** A person's memberships with their plans, soonest first. Two plain queries, no embeds. */
async function plansFor(column: "user_id" | "guest_id", id: string) {
  const members = must(await admin().from("plan_members").select("*").eq(column, id)) as PlanMember[];
  if (members.length === 0) return [];
  const plans = must(await admin().from("plans").select("*").in("id", [...new Set(members.map((m) => m.plan_id))])) as Plan[];
  const byId = new Map(plans.map((p) => [p.id, p]));
  return members
    .flatMap((member) => {
      const plan = byId.get(member.plan_id);
      return plan ? [{ plan, member }] : [];
    })
    .sort((a, b) => (a.plan.starts_at ?? a.plan.created_at).localeCompare(b.plan.starts_at ?? b.plan.created_at));
}

type ListRow = { email: string; token: string; unsubscribed_at: string | null };
const asSubscription = (r: ListRow | null): Subscription | null =>
  r ? { email: r.email, token: r.token, subscribed: r.unsubscribed_at === null } : null;

async function findListRow(list: string, who: { userId: string } | { token: string }): Promise<ListRow | null> {
  const q = admin().from("mailing_list").select("email, token, unsubscribed_at").eq("list", list);
  const rows = must(await ("userId" in who ? q.eq("user_id", who.userId) : q.eq("token", who.token)).order("created_at", { ascending: false }).limit(1)) as ListRow[];
  return rows[0] ?? null;
}

export const supabaseStore: Store = {
  kind: "supabase",

  async getProfile(userId) {
    return must(await admin().from("profiles").select("*").eq("user_id", userId).maybeSingle());
  },
  async upsertProfile(p) {
    must(await admin().from("profiles").upsert(p));
  },
  async setSavedCategories(userId, labels) {
    must(await admin().from("profiles").update({ plan_categories: labels }).eq("user_id", userId));
  },
  async calendarFeedToken(userId, opts) {
    if (!opts?.reset) {
      const had = must(await admin().from("calendar_feeds").select("token").eq("user_id", userId).maybeSingle()) as { token: string } | null;
      if (had) return had.token;
    }
    const token = randomBytes(24).toString("base64url");
    must(await admin().from("calendar_feeds").upsert({ user_id: userId, token, created_at: new Date().toISOString() }));
    return token;
  },
  async userForCalendarToken(token) {
    const row = must(await admin().from("calendar_feeds").select("user_id").eq("token", token).maybeSingle()) as { user_id: string } | null;
    return row?.user_id ?? null;
  },
  async answerBetaPrompt(userId) {
    must(await admin().from("profiles").update({ beta_prompt_answered_at: new Date().toISOString() }).eq("user_id", userId).is("beta_prompt_answered_at", null));
  },

  async findGuestByTokenHash(hash) {
    return must(
      await admin().from("guests").select("id, first_name, last_name, removed_at").eq("device_token_hash", hash).is("removed_at", null).maybeSingle()
    );
  },
  async createGuest({ first_name, last_name, tokenHash }) {
    return must(
      await admin().from("guests").insert({ first_name, last_name, device_token_hash: tokenHash }).select("id, first_name, last_name, removed_at").single()
    );
  },
  async getGuest(guestId) {
    return must(await admin().from("guests").select("id, first_name, last_name, removed_at").eq("id", guestId).is("removed_at", null).maybeSingle());
  },
  async setGuestTokenHash(guestId, hash) {
    must(await admin().from("guests").update({ device_token_hash: hash }).eq("id", guestId));
  },
  async getMember(memberId) {
    return must(await admin().from("plan_members").select("*").eq("id", memberId).maybeSingle()) as PlanMember | null;
  },
  async setMemberGuest(memberId, guestId) {
    must(await admin().from("plan_members").update({ guest_id: guestId }).eq("id", memberId));
  },
  async removeGuest(guestId) {
    const mine = must(await admin().from("plan_members").select("id").eq("guest_id", guestId)) as { id: string }[];
    await this.removePhotosBy(mine.map((m) => m.id));
    must(await admin().from("plan_members").delete().eq("guest_id", guestId));
    must(await admin().from("guests").update({ removed_at: new Date().toISOString(), first_name: "Removed", last_name: "" }).eq("id", guestId));
  },

  async setGuestEmail(guestId, email) {
    must(await admin().from("guests").update({ email: email.toLowerCase(), email_requested_at: new Date().toISOString() }).eq("id", guestId));
  },

  async getSubscription(list, who) {
    return asSubscription(await findListRow(list, who));
  },

  async subscribe(list, { email, userId, source }) {
    const row = must(
      await admin()
        .from("mailing_list")
        .upsert(
          { list, email: email.toLowerCase(), ...(userId ? { user_id: userId } : {}), consent_source: source, consented_at: new Date().toISOString(), unsubscribed_at: null },
          { onConflict: "list,email" },
        )
        .select("email, token, unsubscribed_at")
        .single(),
    ) as ListRow;
    return asSubscription(row)!;
  },

  async unsubscribe(list, who) {
    const row = await findListRow(list, who);
    if (!row) return null;
    if (row.unsubscribed_at === null) {
      must(await admin().from("mailing_list").update({ unsubscribed_at: new Date().toISOString() }).eq("list", list).eq("token", row.token));
    }
    return { email: row.email, token: row.token, subscribed: false };
  },

  async claimGuests(userId, email, guestId) {
    const guestIds = new Set<string>(guestId ? [guestId] : []);
    if (email) {
      const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      const rows = must(
        await admin().from("guests").select("id").eq("email", email.toLowerCase()).gt("email_requested_at", hourAgo).is("removed_at", null)
      ) as { id: string }[];
      for (const r of rows) guestIds.add(r.id);
    }
    if (guestIds.size === 0) return 0;
    const [theirs, mine] = await Promise.all([
      admin().from("plan_members").select("id, plan_id, role").in("guest_id", [...guestIds]).is("user_id", null),
      admin().from("plan_members").select("plan_id").eq("user_id", userId),
    ]);
    const onPlans = new Set((must(mine) as { plan_id: string }[]).map((r) => r.plan_id));
    let moved = 0;
    for (const m of must(theirs) as { id: string; plan_id: string; role: string }[]) {
      if (onPlans.has(m.plan_id)) continue;
      must(await admin().from("plan_members").update({ user_id: userId }).eq("id", m.id));
      // A plan made as a guest becomes theirs on the account too.
      if (m.role === "organiser") must(await admin().from("plans").update({ organiser_id: userId }).eq("id", m.plan_id).is("organiser_id", null));
      onPlans.add(m.plan_id);
      moved++;
    }
    return moved;
  },

  async createPlan(p: NewPlan) {
    const plan = must(
      await admin()
        .from("plans")
        .insert({
          slug: makeSlug(),
          organiser_id: p.organiserUserId,
          title: p.title,
          category: p.category ?? null,
          description: p.description ?? null,
          extras_off: p.extrasOff ?? [],
          area: p.area,
          starts_at: p.startsAt,
          vibe: p.vibe,
          plus_ones: p.plusOnes,
          max_votes: MULTI_VOTES,
          status: p.venue ? "locked" : "voting",
          venue_place_id: p.venue?.placeId ?? null,
          venue_name: p.venue?.name ?? null,
          venue_address: p.venue?.address ?? null,
          vote_deadline: p.venue ? null : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          expires_at: p.startsAt ? new Date(Date.parse(p.startsAt) + 30 * 86400 * 1000).toISOString() : null,
        })
        .select()
        .single()
    ) as Plan;
    const organiser = await this.addMember({ planId: plan.id, userId: p.organiserUserId, guestId: p.organiserGuestId ?? null, name: p.organiserName, role: "organiser" });
    await this.updateMember(organiser.id, { rsvp: "in" });
    return plan;
  },
  async getPlanById(planId) {
    return must(await admin().from("plans").select("*").eq("id", planId).maybeSingle()) as Plan | null;
  },
  async getPlanBySlug(slug) {
    return must(await admin().from("plans").select("*").eq("slug", slug).maybeSingle()) as Plan | null;
  },
  async listPlansForUser(userId) {
    return plansFor("user_id", userId);
  },

  async listPlansForGuest(guestId) {
    return plansFor("guest_id", guestId);
  },

  async listMembers(planId) {
    return must(await admin().from("plan_members").select("*").eq("plan_id", planId).order("joined_at")) as PlanMember[];
  },
  async addMember(m: NewMember) {
    const existing = await this.listMembers(m.planId);
    return must(
      await admin()
        .from("plan_members")
        .insert({
          plan_id: m.planId,
          user_id: m.userId ?? null,
          guest_id: m.guestId ?? null,
          role: m.role,
          display_name: m.name,
          colour: pickColour(m.name, existing),
        })
        .select()
        .single()
    ) as PlanMember;
  },
  async updateMember(memberId, patch) {
    must(await admin().from("plan_members").update(patch).eq("id", memberId));
  },

  async updatePlan(planId, patch) {
    return must(await admin().from("plans").update(patch).eq("id", planId).select().single()) as Plan;
  },

  async listOptions(planId) {
    return must(await admin().from("options").select("*").eq("plan_id", planId).order("created_at")) as PlanOption[];
  },
  async addOption({ planId, label, placeId, note, addedBy }) {
    return must(
      await admin().from("options").insert({ plan_id: planId, label, place_id: placeId ?? null, note: note ?? null, added_by: addedBy ?? null }).select().single()
    ) as PlanOption;
  },
  async removeOption(planId, optionId) {
    // Votes on it go too (votes.option_id cascades).
    must(await admin().from("options").delete().eq("id", optionId).eq("plan_id", planId));
  },
  async listVotes(planId) {
    return must(await admin().from("votes").select("option_id, member_id, options!inner(plan_id)").eq("options.plan_id", planId)).map(
      (v: { option_id: string; member_id: string }) => ({ option_id: v.option_id, member_id: v.member_id })
    ) as Vote[];
  },
  async removeVote(planId, memberId) {
    const ids = (must(await admin().from("options").select("id").eq("plan_id", planId)) as { id: string }[]).map((o) => o.id);
    if (ids.length) must(await admin().from("votes").delete().eq("member_id", memberId).in("option_id", ids));
  },
  async castVote(_planId, optionId, memberId) {
    // With one pick each, the one_vote_per_plan trigger removes their earlier vote on this plan.
    // With more, it adds one, and refuses past the plan's max_votes (the action checks first).
    must(await admin().from("votes").upsert({ option_id: optionId, member_id: memberId }));
  },
  async uncastVote(_planId, optionId, memberId) {
    must(await admin().from("votes").delete().eq("option_id", optionId).eq("member_id", memberId));
  },
  async trimVotes(planId, keep) {
    const rows = must(
      await admin().from("votes").select("option_id, member_id, created_at, options!inner(plan_id)").eq("options.plan_id", planId).order("created_at")
    ) as { option_id: string; member_id: string }[];
    for (const v of overLimit(rows, keep)) must(await admin().from("votes").delete().eq("option_id", v.option_id).eq("member_id", v.member_id));
  },

  async listMessages(planId, limit = 100) {
    const rows = must(await admin().from("messages").select("*").eq("plan_id", planId).order("created_at", { ascending: false }).limit(limit)) as Message[];
    return rows.reverse();
  },
  async addMessage({ planId, memberId, kind, body, mentionsDibby, auto, template }) {
    return must(
      await admin().from("messages").insert({ plan_id: planId, member_id: memberId, kind, body, mentions_dibby: Boolean(mentionsDibby), auto: Boolean(auto), template: template ?? null }).select().single()
    ) as Message;
  },

  async listBills(planId) {
    return must(await admin().from("bills").select("*").eq("plan_id", planId).order("created_at")) as Bill[];
  },
  async createBill(b, shares) {
    const bill = must(await admin().from("bills").insert(b).select().single()) as Bill;
    await this.replaceShares(bill.id, shares);
    return bill;
  },
  async updateBill(billId, patch) {
    must(await admin().from("bills").update(patch).eq("id", billId));
  },
  async replaceShares(billId, shares) {
    must(await admin().from("bill_shares").delete().eq("bill_id", billId));
    if (shares.length === 0) return;
    const at = new Date().toISOString();
    must(
      await admin()
        .from("bill_shares")
        .insert(shares.map((s) => ({ ...s, bill_id: billId, confirmed_at: s.status === "confirmed" ? at : null })))
    );
  },
  async listShares(planId) {
    // Two plain queries rather than an embed: bill_shares has more than one path to bills,
    // so PostgREST refuses to guess ("more than one relationship was found").
    const ids = (must(await admin().from("bills").select("id").eq("plan_id", planId)) as { id: string }[]).map((b) => b.id);
    if (ids.length === 0) return [];
    return must(await admin().from("bill_shares").select("*").in("bill_id", ids)) as BillShare[];
  },
  async updateShare(billId, memberId, patch) {
    must(await admin().from("bill_shares").update(patch).eq("bill_id", billId).eq("member_id", memberId));
  },
  async recordSpin(billId, entrantIds, resultMemberId) {
    must(await admin().from("roulette_spins").insert({ bill_id: billId, entrant_ids: entrantIds, result_member_id: resultMemberId }));
  },

  async listRecap(planId) {
    return must(await admin().from("recap_answers").select("*").eq("plan_id", planId)) as RecapAnswer[];
  },
  async saveRecap(a) {
    must(await admin().from("recap_answers").upsert(a));
  },

  async listReactions(planId) {
    return must(await admin().from("message_reactions").select("message_id, member_id, emoji").eq("plan_id", planId)) as Reaction[];
  },
  async toggleReaction({ planId, message_id, member_id, emoji }) {
    const { data, error } = await admin()
      .from("message_reactions")
      .delete()
      .match({ message_id, member_id, emoji })
      .select("message_id");
    if (error) throw new Error(error.message);
    if (data && data.length > 0) return; // it was there: now it's off
    const ins = await admin().from("message_reactions").insert({ plan_id: planId, message_id, member_id, emoji });
    if (ins.error && ins.error.code !== "23505") throw new Error(ins.error.message);
  },

  async claimNudge(planId, kind, key) {
    const { error } = await admin().from("dibby_nudges").insert({ plan_id: planId, kind, key });
    if (!error) return true;
    if (error.code === "23505") return false; // already claimed
    throw new Error(error.message);
  },
  async countNudgesSince(planId, sinceIso) {
    const { count, error } = await admin()
      .from("dibby_nudges")
      .select("*", { count: "exact", head: true })
      .eq("plan_id", planId)
      .gte("created_at", sinceIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },
  async deleteAccount(userId) {
    // Their photos go first, while their memberships still point at them.
    const mine = must(await admin().from("plan_members").select("id").eq("user_id", userId)) as { id: string }[];
    await this.removePhotosBy(mine.map((m) => m.id));
    // Rename first: the sign-in's foreign keys only null the IDs, they'd leave the name behind.
    must(await admin().from("plan_members").update({ display_name: FORMER_MEMBER, user_id: null }).eq("user_id", userId));
    must(await admin().from("plans").update({ organiser_id: null }).eq("organiser_id", userId));
    must(await admin().from("mailing_list").delete().eq("user_id", userId));
    const ev = await admin().from("events").update({ user_id: null }).eq("user_id", userId);
    if (ev.error) console.warn("[delete account] events", ev.error.message);
    must(await admin().from("profiles").delete().eq("user_id", userId));
    const { error } = await admin().auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
  },
  async listPhotos(planId) {
    return must(await admin().from("plan_photos").select("id, plan_id, member_id, width, height, glow, created_at").eq("plan_id", planId).order("created_at")) as PlanPhoto[];
  },
  async addPhoto({ planId, memberId, bytes, width, height, glow }) {
    const id = crypto.randomUUID();
    const path = `${planId}/${id}.jpg`;
    const up = await admin().storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    if (up.error) throw new Error(up.error.message);
    return must(await admin().from("plan_photos").insert({ id, plan_id: planId, member_id: memberId, path, width, height, glow }).select("id, plan_id, member_id, width, height, glow, created_at").single()) as PlanPhoto;
  },
  async photoBytes(photo) {
    const row = must(await admin().from("plan_photos").select("path").eq("id", photo.id).maybeSingle()) as { path: string } | null;
    if (!row) return null;
    const { data, error } = await admin().storage.from(PHOTO_BUCKET).download(row.path);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  },
  async removePhoto(planId, photoId) {
    const row = must(await admin().from("plan_photos").select("path").eq("plan_id", planId).eq("id", photoId).maybeSingle()) as { path: string } | null;
    if (!row) return;
    await admin().storage.from(PHOTO_BUCKET).remove([row.path]);
    must(await admin().from("plan_photos").delete().eq("id", photoId));
  },
  async removePhotosBy(memberIds) {
    if (memberIds.length === 0) return;
    const rows = must(await admin().from("plan_photos").select("id, path").in("member_id", memberIds)) as { id: string; path: string }[];
    if (rows.length === 0) return;
    await admin().storage.from(PHOTO_BUCKET).remove(rows.map((r) => r.path));
    must(await admin().from("plan_photos").delete().in("id", rows.map((r) => r.id)));
  },
  async listTimes(planId) {
    return must(await admin().from("plan_times").select("id, plan_id, starts_at").eq("plan_id", planId)) as PlanTime[];
  },
  async listTimeVotes(planId) {
    return must(await admin().from("time_votes").select("time_id, member_id").eq("plan_id", planId)) as TimeVote[];
  },
  async addTime(planId, startsAt) {
    must(await admin().from("plan_times").upsert({ plan_id: planId, starts_at: startsAt }, { onConflict: "plan_id,starts_at", ignoreDuplicates: true }));
  },
  async removeTime(planId, timeId) {
    must(await admin().from("plan_times").delete().eq("plan_id", planId).eq("id", timeId));
  },
  async toggleTimeVote(planId, timeId, memberId) {
    const time = must(await admin().from("plan_times").select("id").eq("plan_id", planId).eq("id", timeId).maybeSingle());
    if (!time) return;
    const gone = must(await admin().from("time_votes").delete().eq("time_id", timeId).eq("member_id", memberId).select("time_id")) as unknown[];
    if (gone.length === 0) must(await admin().from("time_votes").insert({ time_id: timeId, plan_id: planId, member_id: memberId }));
  },
  async removeTimeVotes(planId, memberId) {
    must(await admin().from("time_votes").delete().eq("plan_id", planId).eq("member_id", memberId));
  },
  async clearTimes(planId) {
    must(await admin().from("plan_times").delete().eq("plan_id", planId));
  },
  async logEvent(e) {
    const { error } = await admin().from("events").insert({
      name: e.name,
      plan_id: e.planId ?? null,
      user_id: e.userId ?? null,
      guest_id: e.guestId ?? null,
      bill_id: e.billId ?? null,
      props: e.props ?? {},
    });
    if (error) console.warn("[events]", e.name, error.message);
  },
  async listEvents(sinceIso) {
    const out: LoggedEvent[] = [];
    // Paged: Supabase caps a select at 1,000 rows.
    for (let from = 0; ; from += 1000) {
      const rows = must(
        await admin().from("events").select("name, plan_id, user_id, guest_id, bill_id, props, at").gte("at", sinceIso).order("at").range(from, from + 999)
      ) as { name: LoggedEvent["name"]; plan_id: string | null; user_id: string | null; guest_id: string | null; bill_id: string | null; props: LoggedEvent["props"]; at: string }[];
      for (const r of rows) out.push({ name: r.name, planId: r.plan_id, userId: r.user_id, guestId: r.guest_id, billId: r.bill_id, props: r.props, at: r.at });
      if (rows.length < 1000) return out;
    }
  },
};
