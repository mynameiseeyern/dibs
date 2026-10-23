import "server-only";
import type { AppEvent } from "@dibs/shared/metrics";
import { memoryStore } from "./memory";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export const usingSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * The store, with the pilot's key moments logged on the way through (ARV-50), so every path
 * that makes a plan, locks it, adds a bill or settles a share counts, wherever it's called from.
 * Joins, shares and "Get the app" taps are logged where they happen (lib/events.ts).
 */
function withEvents(base: Store): Store {
  const log = (e: AppEvent) => base.logEvent(e).catch((err) => console.warn("[events]", e.name, err));
  const owed = (shares: { status: string }[]) => shares.filter((s) => s.status !== "confirmed").length;
  const wrapped: Partial<Store> = {
    async createPlan(p) {
      const plan = await base.createPlan(p);
      await log({ name: "plan_created", planId: plan.id, userId: p.organiserUserId, props: { decided: Boolean(p.venue) } });
      // "Already decided" starts locked: it reached a decision on day one.
      if (plan.status === "locked") await log({ name: "plan_locked", planId: plan.id, props: { how: "set" } });
      return plan;
    },
    async updatePlan(planId, patch) {
      const plan = await base.updatePlan(planId, patch);
      if (patch.status === "locked") await log({ name: "plan_locked", planId, props: { how: patch.vote_deadline === null ? "set" : "vote" } });
      return plan;
    },
    async createBill(b, shares) {
      const bill = await base.createBill(b, shares);
      await log({ name: "bill_created", planId: b.plan_id, billId: bill.id, props: { owed: owed(shares), split: b.split_mode } });
      return bill;
    },
    async replaceShares(billId, shares) {
      await base.replaceShares(billId, shares);
      await log({ name: "bill_shares_set", billId, props: { owed: owed(shares) } });
    },
    async updateShare(billId, memberId, patch) {
      await base.updateShare(billId, memberId, patch);
      if (patch.status === "confirmed") await log({ name: "share_settled", billId });
    },
  };
  return new Proxy(base, {
    get(target, key, receiver) {
      if (typeof key === "string" && key in wrapped) return wrapped[key as keyof Store];
      return Reflect.get(target, key, receiver);
    },
  });
}

export const store: Store = withEvents(usingSupabase ? supabaseStore : memoryStore);
export type * from "./types";
