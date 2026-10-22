"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Vibe } from "@dibs/shared/types";
import { currentOrganiser, demoSignIn, signOut } from "@/lib/auth";
import { clearGuestSession, currentGuest } from "@/lib/guest";
import { store, usingSupabase } from "@/lib/store";
import { draftPlan, type DraftPicks } from "@/lib/dibby";
import { localToIso } from "@/lib/time";
import { siteUrl } from "@/lib/site";
import { BETA_LIST } from "@dibs/email";
import { getPlace } from "@/lib/places";

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
  // Opt-in only: the box starts unticked, and ticking it is the consent we keep a record of.
  if (form.get("beta_updates") === "on" && me.email) {
    try {
      await store.subscribe(BETA_LIST, { email: me.email, userId: me.id, source: "onboarding" });
    } catch (e) {
      // Not worth blocking sign-up over; they can turn it on from their account.
      console.error("[onboarding] beta updates subscribe failed", me.id, e);
    }
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

  // "I've got a place": a real business from the map, and the plan starts locked to it.
  let venue: { placeId: string; name: string } | null = null;
  if (form.get("where") === "place") {
    const place = await getPlace(String(form.get("venue_place_id") ?? ""));
    if (!place) return { error: "Pick the place on the map, or put it to a vote." };
    venue = { placeId: place.placeId, name: place.name };
  }

  const plan = await store.createPlan({
    organiserUserId: me.id,
    organiserName: `${profile.first_name} ${profile.last_name}`,
    title,
    area: venue ? null : clean(form.get("area"), 80) || null,
    startsAt,
    vibe,
    plusOnes: form.get("plus_ones") === "on",
    venue,
  });
  redirect(`/p/${plan.slug}`);
}

/** The Ask Dibby chips. Anything malformed is dropped rather than guessed at. */
function readPicks(form: FormData): DraftPicks {
  const date = String(form.get("pick_date") ?? "");
  const time = String(form.get("pick_time") ?? "");
  const spend = Number(form.get("pick_spend"));
  const lat = Number(form.get("near_lat"));
  const lng = Number(form.get("near_lng"));
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null,
    spend: spend === 1 || spend === 2 || spend === 3 ? spend : null,
    near: form.get("near_lat") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null,
  };
}

/** "Fri 24 Oct · 7pm · $$ · near me", so the thread shows what was asked. */
function picksLabel(p: DraftPicks): string {
  const day = p.date ? new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${p.date}T00:00:00Z`)) : null;
  const time = p.time
    ? new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", hour: "numeric", minute: p.time.endsWith(":00") ? undefined : "2-digit" }).format(new Date(`2000-01-01T${p.time}:00Z`)).replace(/\s/g, "")
    : null;
  return [day, time, p.spend ? "$".repeat(p.spend) : null, p.near ? "near me" : null].filter(Boolean).join(" · ");
}

/** "@dibby dinner friday in surry hills, cheap-ish": Dibby drafts the plan and the vote. */
export async function createWithDibby(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await currentOrganiser();
  if (!me) redirect("/login?next=/new");
  const profile = await store.getProfile(me.id);
  if (!profile) redirect("/onboarding?next=/new");
  const ask = String(form.get("ask") ?? "").replace(/^\s*@dibby\s*/i, "").trim().slice(0, 500);
  const picks = readPicks(form);
  if (!ask && !picks.date && !picks.time && !picks.spend) return { error: "Tell Dibby what you're after, like “dumplings”, or tap a day and a time." };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Dibby isn't switched on yet. Fill in the form below for now." };

  let draft;
  try {
    draft = await draftPlan(ask, (["chill", "extra", "straight"].includes(String(form.get("vibe"))) ? form.get("vibe") : "chill") as Vibe, picks);
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
  await store.addMessage({ planId: plan.id, memberId: organiser?.id ?? null, kind: "text", body: `@dibby ${[ask, picksLabel(picks)].filter(Boolean).join(" · ")}`, mentionsDibby: true });
  await store.addMessage({
    planId: plan.id,
    memberId: null,
    kind: "system",
    body: "Heads up: messages that tag @dibby are sent to an AI provider so Dibby can reply. Dibby only reads messages it's tagged in.",
  });
  const tail = draft.venues.length ? "Vote's open for 24 hours." : "Couldn't find spots for that on Maps, so add a few from the map and the vote opens.";
  await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: `${draft.reply} ${tail}` });
  redirect(`/p/${plan.slug}`);
}
