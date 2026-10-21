import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { makeSlug, pickColour } from "@dibs/shared/plans";
import type { NewMember, NewPlan, Plan, PlanMember, Store } from "./types";

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
          vote_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
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
    const rows = must(await admin().from("plan_members").select("*, plan:plans(*)").eq("user_id", userId)) as (PlanMember & { plan: Plan })[];
    return rows
      .map(({ plan, ...member }) => ({ plan, member: member as PlanMember }))
      .sort((a, b) => (a.plan.starts_at ?? a.plan.created_at).localeCompare(b.plan.starts_at ?? b.plan.created_at));
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
};
