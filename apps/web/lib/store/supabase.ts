import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { makeSlug, pickColour } from "@dibs/shared/plans";
import type { Bill, BillShare, Message, NewMember, NewPlan, Plan, PlanMember, PlanOption, Store, Subscription, Vote, RecapAnswer, Reaction } from "./types";

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
  async removeGuest(guestId) {
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
      admin().from("plan_members").select("id, plan_id").in("guest_id", [...guestIds]).is("user_id", null),
      admin().from("plan_members").select("plan_id").eq("user_id", userId),
    ]);
    const onPlans = new Set((must(mine) as { plan_id: string }[]).map((r) => r.plan_id));
    let moved = 0;
    for (const m of must(theirs) as { id: string; plan_id: string }[]) {
      if (onPlans.has(m.plan_id)) continue;
      must(await admin().from("plan_members").update({ user_id: userId }).eq("id", m.id));
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
          area: p.area,
          starts_at: p.startsAt,
          vibe: p.vibe,
          plus_ones: p.plusOnes,
          status: p.venue ? "locked" : "voting",
          venue_place_id: p.venue?.placeId ?? null,
          venue_name: p.venue?.name ?? null,
          vote_deadline: p.venue ? null : new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          expires_at: p.startsAt ? new Date(Date.parse(p.startsAt) + 30 * 86400 * 1000).toISOString() : null,
        })
        .select()
        .single()
    ) as Plan;
    const organiser = await this.addMember({ planId: plan.id, userId: p.organiserUserId, name: p.organiserName, role: "organiser" });
    await this.updateMember(organiser.id, { rsvp: "in" });
    return plan;
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
  async castVote(_planId, optionId, memberId) {
    // The one_vote_per_plan trigger removes their earlier vote on this plan.
    must(await admin().from("votes").upsert({ option_id: optionId, member_id: memberId }));
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
};
