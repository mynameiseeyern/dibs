"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Vibe } from "@dibs/shared/types";
import { currentOrganiser, demoSignIn, signOut } from "@/lib/auth";
import { clearGuestSession, currentGuest } from "@/lib/guest";
import { store, usingSupabase } from "@/lib/store";
import { draftPlan } from "@/lib/dibby";
import { localToIso } from "@/lib/time";
import { siteUrl } from "@/lib/site";

export type FormState = { error?: string; sent?: string } | undefined;

const clean = (v: FormDataEntryValue | null, max = 80) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Organiser sign-in: magic link with Supabase, or straight in for the local demo. */
export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const next = safeNext(String(form.get("next") ?? "/home"));
  if (!usingSupabase) {
    await demoSignIn();
    redirect(next);
  }
  const email = clean(form.get("email"), 200).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email doesn't look right." };
  return sendLink(email, next);
}

/** Guest adds an email so their plans follow them to any browser (and become an account). */
export async function keepMyPlans(_prev: FormState, form: FormData): Promise<FormState> {
  const guest = await currentGuest();
  if (!guest) return { error: "Join a plan first, then you can keep it." };
  const email = clean(form.get("email"), 200).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email doesn't look right." };
  try {
    await store.setGuestEmail(guest.id, email);
  } catch (e) {
    console.error("[keep plans] save email", e);
    return { error: "Couldn't save that. Try again in a sec." };
  }
  if (!usingSupabase) {
    await demoSignIn();
    redirect("/home");
  }
  return sendLink(email, "/home");
}

async function sendLink(email: string, next: string): Promise<FormState> {
  const site = siteUrl();
  // Implicit flow: the link carries the session itself, so it works in whichever browser
  // the email app opens it in. (The default PKCE link only works in the asking browser.)
  const mailer = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await mailer.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${site}/auth/done?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    // Shows up in Vercel's logs, so we can see the real reason.
    console.error("[sign-in]", error.status, error.code, error.message);
    if (error.status === 429 || /rate limit/i.test(error.message)) {
      return { error: "Too many sign-in emails just now. Give it a bit and try again." };
    }
    if (/redirect|url/i.test(error.message)) {
      return { error: "Sign-in isn't set up for this address yet. Add it to Supabase's redirect URLs." };
    }
    return { error: "Couldn't send the link. Try again in a sec." };
  }
  return { sent: email };
}

// Signing out also forgets the guest on this browser: their plans are on the account now,
// and the next person to sign in here shouldn't inherit them.
export async function signOutAction() {
  await signOut();
  await clearGuestSession();
  redirect("/");
}

/** Sign out and straight back to the sign-in page, to come back as someone else. */
export async function switchAccountAction() {
  await signOut();
  await clearGuestSession();
  redirect("/login?next=/home");
}

/** "Not you?" on a shared phone: this device stops being that guest. Their RSVPs stay on the plans. */
export async function forgetDeviceAction() {
  await clearGuestSession();
  redirect("/");
}

function safeNext(n: string) {
  return n.startsWith("/") && !n.startsWith("//") ? n : "/home";
}

function isAdult(dob: string): boolean {
  const d = new Date(dob + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const eighteen = new Date(Date.UTC(d.getUTCFullYear() + 18, d.getUTCMonth(), d.getUTCDate()));
  return eighteen <= now;
}

/** First sign-up: name, date of birth (18+), and optional PayID for getting paid back. */
export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await currentOrganiser();
  if (!me) redirect("/login");
  const first = clean(form.get("first_name"), 40);
  const last = clean(form.get("last_name"), 40);
  const dob = clean(form.get("dob"), 10);
  const payid = clean(form.get("payid"), 100) || null;
  if (!first || !last) return { error: "We need your first and last name." };
  if (!isAdult(dob)) return { error: "You need to be 18 or over to organise plans on dibs." };
  try {
    await store.upsertProfile({ user_id: me.id, first_name: first, last_name: last, dob, payid, payid_name: payid ? `${first} ${last}` : null });
  } catch (e) {
    // Shows in Vercel's logs with the database's reason.
    console.error("[onboarding] save profile failed", me.id, e);
    return { error: "Couldn't save that. Try again in a sec, and if it keeps happening, tell Ee." };
  }
  redirect(safeNext(String(form.get("next") ?? "/new")));
}

export async function createPlan(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await currentOrganiser();
  if (!me) redirect("/login?next=/new");
  const profile = await store.getProfile(me.id);
  if (!profile) redirect("/onboarding?next=/new");

  const title = clean(form.get("title"), 80);
  if (!title) return { error: "Give it a name, like “Friday dinner”." };
  const whenRaw = clean(form.get("starts_at"), 16);
  const startsAt = whenRaw ? localToIso(whenRaw) : null;
  if (whenRaw && !startsAt) return { error: "That date and time doesn't look right." };
  const vibe = (["chill", "extra", "straight"].includes(String(form.get("vibe"))) ? form.get("vibe") : "chill") as Vibe;

  const plan = await store.createPlan({
    organiserUserId: me.id,
    organiserName: `${profile.first_name} ${profile.last_name}`,
    title,
    area: clean(form.get("area"), 80) || null,
    startsAt,
    vibe,
    plusOnes: form.get("plus_ones") === "on",
  });
  redirect(`/p/${plan.slug}`);
}

/** "@dibby dinner friday in surry hills, cheap-ish": Dibby drafts the plan and the vote. */
export async function createWithDibby(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await currentOrganiser();
  if (!me) redirect("/login?next=/new");
  const profile = await store.getProfile(me.id);
  if (!profile) redirect("/onboarding?next=/new");
  const ask = String(form.get("ask") ?? "").replace(/^\s*@dibby\s*/i, "").trim().slice(0, 500);
  if (!ask) return { error: "Tell Dibby what you're after, like “dinner Friday in Surry Hills”." };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Dibby isn't switched on yet. Fill in the form below for now." };

  let draft;
  try {
    draft = await draftPlan(ask, (["chill", "extra", "straight"].includes(String(form.get("vibe"))) ? form.get("vibe") : "chill") as Vibe);
  } catch (e) {
    console.error("[dibby draft]", e);
    return { error: "brb, Dibby's having a moment. Try again, or fill in the form below." };
  }
  const plan = await store.createPlan({
    organiserUserId: me.id,
    organiserName: `${profile.first_name} ${profile.last_name}`,
    title: draft.title,
    area: draft.area,
    startsAt: draft.startsAtLocal ? localToIso(draft.startsAtLocal) : null,
    vibe: draft.vibe,
    plusOnes: false,
  });
  for (const v of draft.venues) {
    await store.addOption({ planId: plan.id, label: v.name, placeId: v.placeId, note: v.address });
  }
  const members = await store.listMembers(plan.id);
  const organiser = members.find((m) => m.user_id === me.id) ?? null;
  await store.addMessage({ planId: plan.id, memberId: organiser?.id ?? null, kind: "text", body: `@dibby ${ask}`, mentionsDibby: true });
  await store.addMessage({
    planId: plan.id,
    memberId: null,
    kind: "system",
    body: "Heads up: messages that tag @dibby are sent to an AI provider so Dibby can reply. Dibby only reads messages it's tagged in.",
  });
  const unchecked = draft.checked ? "" : " (I couldn't check these on Maps, so give them a once-over.)";
  await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: `${draft.reply}${unchecked} Vote's open for 24 hours.` });
  redirect(`/p/${plan.slug}`);
}
