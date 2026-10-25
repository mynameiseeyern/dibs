"use server";

import { renderTemplate, type Template } from "@/lib/copy";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BillError, formatAud, netDebts, rouletteAllowed, spinRoulette, splitBill } from "@dibs/shared/bills";
import { store } from "@/lib/store";
import { loadPlan } from "@/lib/viewer";

export type FormState = { error?: string } | undefined;

const path = (slug: string) => `/p/${slug}/bills`;
const clean = (v: FormDataEntryValue | null, max = 80) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** A host (organiser or co-host) ticks who actually came. Only they can be on bills or see a PayID. */
export async function wrapUp(slug: string, form: FormData): Promise<void> {
  const view = await loadPlan(slug);
  if (!view || !view.isHost || view.plan.status === "cancelled") return;
  const came = new Set(form.getAll("came").map(String));
  for (const m of view.members) {
    await store.updateMember(m.id, { attended: came.has(m.id) });
  }
  // Last-minute arrivals the host typed in: members with no account or device, there for the bills.
  const known = new Set(view.members.map((m) => m.display_name.toLowerCase()));
  const walkIns = [...new Set(form.getAll("walkin").map((v) => clean(v, 40)).filter(Boolean))].filter((n) => !known.has(n.toLowerCase())).slice(0, 20);
  for (const name of walkIns) {
    const m = await store.addMember({ planId: view.plan.id, name, role: "guest" });
    await store.updateMember(m.id, { rsvp: "in", attended: true });
    came.add(m.id);
  }
  // "Nothing to split": a hangout where nobody paid, or people sorted it themselves.
  const noBills = form.get("next") === "none";
  if (view.plan.status !== "wrapped") {
    await store.updatePlan(view.plan.id, { status: "wrapped", no_bills: noBills });
    await store.addMessage({ planId: view.plan.id, memberId: null, kind: "system", body: `${came.size} came. ${noBills ? "Nothing to split." : "Time to square up."}` });
    // Wrap-up is when the Dibby camera's photos develop.
    const shots = (await store.listPhotos(view.plan.id)).length;
    if (shots > 0) {
      await store.addMessage({ planId: view.plan.id, memberId: null, kind: "dibby", body: `The photos are in: ${shots} from the night. Have a look in the recap.` });
    }
  } else if (noBills !== view.plan.no_bills) {
    await store.updatePlan(view.plan.id, { no_bills: noBills });
  }
  if (noBills) {
    revalidatePath(`/p/${slug}`);
    redirect(`/p/${slug}`);
  }
  redirect(path(slug));
}

/** Parse dollars into cents: "$186", "186.5", "1,204.00" -> cents. */
function toCents(raw: string): number | null {
  const n = raw.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(n)) return null;
  const [d, c = ""] = n.split(".");
  return Number(d) * 100 + Number(c.padEnd(2, "0"));
}

export async function addBill(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const view = await loadPlan(slug);
  if (!view?.me || !view.me.attended) return { error: "Only people who came can add bills." };
  const title = clean(form.get("title")) || "Bill";
  const total = toCents(clean(form.get("total"), 20));
  if (total === null || total <= 0) return { error: "Pop in the total, like 186.00." };
  if (total > 10_000_00) return { error: "That's over $10,000. Double-check the total." };

  const mode = String(form.get("mode"));
  const attendees = view.members.filter((m) => m.attended);
  const on = mode === "exclude" ? attendees.filter((m) => form.getAll("on").map(String).includes(m.id)) : attendees;
  if (on.length === 0) return { error: "Tick at least one person." };

  // Payers without a PayID on their profile (guests) add it on the bill.
  const profile = view.me.user_id ? await store.getProfile(view.me.user_id) : null;
  const payid = clean(form.get("payid"), 100) || null;
  if (!profile?.payid && !payid) return { error: "Add your PayID so people can pay you back." };

  const base = {
    plan_id: view.plan.id,
    payer_member_id: view.me.id,
    title,
    total_cents: total,
    currency: "AUD",
    seed: randomBytes(8).toString("hex"),
    payid: profile?.payid ? null : payid,
    payid_name: profile?.payid ? null : view.me.display_name,
  };

  if (mode === "roulette") {
    if (!rouletteAllowed(total)) return { error: "Too big for roulette. Split it instead." };
    // Shares are made after the spin; until then everyone opts in or out.
    await store.createBill({ ...base, split_mode: "roulette" }, []);
  } else {
    try {
      const splitMode = mode === "exclude" || mode === "amount" || mode === "percent" ? mode : "even";
      // "$" and "%": one field per person, blank means nothing.
      const amounts: Record<string, number> = {};
      const basisPoints: Record<string, number> = {};
      for (const m of attendees) {
        const raw = clean(form.get(`${splitMode}:${m.id}`), 20);
        if (!raw) continue;
        if (splitMode === "amount") {
          const c = toCents(raw);
          if (c === null) return { error: `${m.display_name.split(" ")[0]}'s amount doesn't look right.` };
          if (c > 0) amounts[m.id] = c;
        } else if (splitMode === "percent") {
          const pct = Number(raw.replace(/[%\s]/g, ""));
          if (!Number.isFinite(pct) || pct < 0) return { error: `${m.display_name.split(" ")[0]}'s percentage doesn't look right.` };
          if (pct > 0) basisPoints[m.id] = Math.round(pct * 100);
        }
      }
      const added = Object.values(amounts).reduce((n, c) => n + c, 0);
      if (splitMode === "amount" && added !== total) return { error: `The amounts add up to ${formatAud(added)}, but the bill is ${formatAud(total)}.` };
      const shares = splitBill(
        {
          totalCents: total,
          payerId: view.me.id,
          mode: splitMode,
          seed: base.seed,
          excludedIds: attendees.filter((m) => !on.includes(m)).map((m) => m.id),
          amounts,
          basisPoints,
        },
        attendees.map((m) => ({ id: m.id, plusOnes: m.plus_one ? 1 : 0 }))
      ).filter((s) => s.cents > 0);
      await store.createBill(
        { ...base, split_mode: splitMode },
        shares.map((s) => ({ member_id: s.personId, amount_cents: s.cents, status: s.status }))
      );
    } catch (e) {
      return { error: e instanceof BillError ? e.message : "Couldn't split that. Try again." };
    }
  }
  revalidatePath(path(slug));
  redirect(path(slug));
}

async function billFor(slug: string, billId: string) {
  const view = await loadPlan(slug);
  if (!view?.me?.attended) return null;
  const bill = (await store.listBills(view.plan.id)).find((b) => b.id === billId);
  return bill ? { view, bill, me: view.me } : null;
}

/** Opt in or out of a roulette spin. Nobody is on the wheel without choosing to be. */
/**
 * Opt in or out of a spin. 18+ only: members are checked from their date of birth,
 * guests (no account, no DOB) confirm with a tick when they opt in.
 */
export async function toggleSpin(slug: string, billId: string, form?: FormData): Promise<void> {
  const r = await billFor(slug, billId);
  if (!r || r.bill.split_mode !== "roulette" || r.bill.roulette_loser_id) return;
  const set = new Set(r.bill.roulette_entrants);
  if (set.has(r.me.id)) set.delete(r.me.id);
  else {
    if (!(await canPlay(r.me, form))) return;
    set.add(r.me.id);
  }
  await store.updateBill(billId, { roulette_entrants: [...set] });
  revalidatePath(path(slug));
}

async function canPlay(me: { user_id: string | null }, form?: FormData): Promise<boolean> {
  if (me.user_id) {
    const profile = await store.getProfile(me.user_id);
    return profile ? isAdult(profile.dob) : form?.get("adult") === "on";
  }
  return form?.get("adult") === "on";
}

function isAdult(dob: string): boolean {
  const d = new Date(dob + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  return new Date(Date.UTC(d.getUTCFullYear() + 18, d.getUTCMonth(), d.getUTCDate())) <= new Date();
}

/** The payer spins. The result is saved before any animation, so a refresh can't re-roll it. */
export async function spin(slug: string, billId: string): Promise<void> {
  const r = await billFor(slug, billId);
  if (!r || r.bill.split_mode !== "roulette" || r.bill.roulette_loser_id || r.bill.payer_member_id !== r.me.id) return;
  if (r.bill.roulette_entrants.length < 2) return;
  const loser = spinRoulette(r.bill.roulette_entrants, `${r.bill.seed}:spin`);
  await store.updateBill(billId, { roulette_loser_id: loser });
  await store.recordSpin(billId, r.bill.roulette_entrants, loser);
  // Loser owes the whole bill to the payer (nothing, if the payer lost their own spin).
  if (loser !== r.bill.payer_member_id) {
    await store.replaceShares(billId, [{ member_id: loser, amount_cents: r.bill.total_cents, status: "owed" }]);
  }
  const name = r.view.members.find((m) => m.id === loser)?.display_name.split(" ")[0] ?? "Someone";
  const template: Template = { k: "roulette", bill: r.bill.title, name, payerSpun: loser === r.bill.payer_member_id };
  await store.addMessage({ planId: r.view.plan.id, memberId: null, kind: "dibby", body: renderTemplate(template, r.view.plan.vibe), template });
  redirect(path(slug));
}

export async function saysPaid(slug: string, billId: string): Promise<void> {
  const r = await billFor(slug, billId);
  if (!r) return;
  await store.updateShare(billId, r.me.id, { status: "says_paid", says_paid_at: new Date().toISOString() });
  revalidatePath(path(slug));
}

/** Only the payer can confirm. A share is settled once they've checked their bank. */
export async function confirmPaid(slug: string, billId: string, memberId: string): Promise<void> {
  const r = await billFor(slug, billId);
  if (!r || r.bill.payer_member_id !== r.me.id) return;
  await store.updateShare(billId, memberId, { status: "confirmed", confirmed_at: new Date().toISOString() });
  revalidatePath(path(slug));
}

/**
 * Settle up with someone you each owe across different bills (netting, ARV-25).
 * Net owed by me: my shares to them go to "says paid", and theirs to me are squared off
 * against it. Both get the same timestamp, so their confirm row can show the net amount.
 * Net zero: both sides are square straight away.
 */
export async function settleNet(slug: string, otherId: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me?.attended) return;
  const me = view.me;
  const [bills, shares] = await Promise.all([store.listBills(view.plan.id), store.listShares(view.plan.id)]);
  const payer = new Map(bills.map((b) => [b.id, b.payer_member_id]));
  const mine = shares.filter((x) => x.status === "owed" && x.amount_cents > 0 && x.member_id === me.id && payer.get(x.bill_id) === otherId);
  const theirs = shares.filter((x) => x.status === "owed" && x.amount_cents > 0 && x.member_id === otherId && payer.get(x.bill_id) === me.id);
  if (mine.length === 0 || theirs.length === 0) return;
  const [d] = netDebts([
    ...mine.map((x) => ({ from: me.id, to: otherId, cents: x.amount_cents })),
    ...theirs.map((x) => ({ from: otherId, to: me.id, cents: x.amount_cents })),
  ]);
  const net = !d ? 0 : d.from === me.id ? d.cents : -d.cents;
  if (net < 0) return; // they owe me after netting: theirs to settle
  const at = new Date().toISOString();
  for (const x of mine) {
    await store.updateShare(x.bill_id, me.id, net === 0 ? { status: "confirmed", confirmed_at: at } : { status: "says_paid", says_paid_at: at });
  }
  for (const x of theirs) await store.updateShare(x.bill_id, otherId, { status: "confirmed", confirmed_at: at });
  revalidatePath(path(slug));
}
