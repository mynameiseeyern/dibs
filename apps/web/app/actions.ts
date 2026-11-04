"use server";

import { track } from "@/lib/events";
import { readNear } from "@/lib/near";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Vibe } from "@dibs/shared/types";
import { currentOrganiser, demoSignIn, signOut } from "@/lib/auth";
import { clearGuestSession, createGuestSession, currentGuest } from "@/lib/guest";
import { store, usingSupabase, type Guest } from "@/lib/store";
import { report } from "@/lib/report";
import { draftPlan, type DraftPicks } from "@/lib/dibby";
import { localToIso } from "@/lib/time";
import { resolveStart } from "@dibs/shared/when";
import { siteUrl } from "@/lib/site";
import { BETA_LIST } from "@dibs/email";
import { cleanCategory, cleanCustomPlace, cleanDescription, extrasOffFrom, rememberCategory } from "@dibs/shared/plans";
import { getPlace } from "@/lib/places";
import { withPlaces } from "@/lib/place-ids";

/** `field`: which form field the error is about, so it shows under that field. */
export type FormState = { error?: string; field?: string; sent?: string } | undefined;

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
  // Asked from a plan (the chat's email box): the link brings them back to it.
  const rawNext = String(form.get("next") ?? "");
  const next = /^\/p\/[\w-]+(\/chat)?$/.test(rawNext) ? rawNext : "/home";
  if (!usingSupabase) {
    await demoSignIn();
    redirect(next);
  }
  return sendLink(email, next);
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

/**
 * Delete my account (ARV-53). Memberships become "Former member" so shared bills stay right;
 * the profile, PayID, email list rows and sign-in are deleted. Then signed out, and home.
 */
export async function deleteAccountAction(): Promise<{ error?: string }> {
  const me = await currentOrganiser();
  if (!me) return { error: "You're not signed in." };
  try {
    await store.deleteAccount(me.id);
  } catch (e) {
    console.error("[delete account]", e);
    return { error: "Couldn't delete it just then. Try again, or email hello@dibby.social and we'll do it." };
  }
  await signOut().catch(() => {});
  await clearGuestSession();
  redirect("/?bye=1");
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

/** First sign-up: name, and optional PayID for getting paid back. */
export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await currentOrganiser();
  if (!me) redirect("/login");
  const first = clean(form.get("first_name"), 40);
  const last = clean(form.get("last_name"), 40);
  const payid = clean(form.get("payid"), 100) || null;
  if (!first || !last) return { error: "We need your first and last name." };
  const isNew = !(await store.getProfile(me.id).catch(() => null));
  try {
    await store.upsertProfile({ user_id: me.id, first_name: first, last_name: last, dob: null, payid, payid_name: payid ? `${first} ${last}` : null });
  } catch (e) {
    // Shows in Vercel's logs with the database's reason.
    console.error("[onboarding] save profile failed", me.id, e);
    return { error: "Couldn't save that. Try again in a sec, and if it keeps happening, tell Ee." };
  }
  if (isNew) await track({ name: "account_created", userId: me.id, props: { via: "sign_up" } });
  // The sign-up box is their answer to beta updates either way, so the home card never asks.
  await store.answerBetaPrompt(me.id).catch((e) => console.error("[onboarding] beta prompt", me.id, e));
  // Opt-in only: the box starts unticked, and ticking it is the consent we keep a record of.
  if (form.get("beta_updates") === "on" && me.email) {
    try {
      await store.subscribe(BETA_LIST, { email: me.email, userId: me.id, source: "onboarding" });
    } catch (e) {
      // Not worth blocking sign-up over; they can turn it on from their account.
      console.error("[onboarding] beta updates subscribe failed", me.id, e);
    }
  }
  redirect(safeNext(String(form.get("next") ?? "/")));
}

/**
 * One form for every new plan. Name, when (day/time chips, fixed facts) and vibe are shared;
 * "where" is a place picked on the map, a vote the crew fills, or a vote Dibby seeds with three
 * real spots.
 */
export async function createPlan(_prev: FormState, form: FormData): Promise<FormState> {
  const host = await whoIsOrganising(form);
  if ("error" in host) return host;

  const where = String(form.get("where") ?? "vote");
  const picks = readPicks(form);
  const vibe = (["chill", "extra", "straight"].includes(String(form.get("vibe"))) ? form.get("vibe") : "chill") as Vibe;
  // Plus-ones are welcome unless the organiser switches them off in Edit plan.
  const plusOnes = true;
  const title = clean(form.get("title"), 80);
  const startLocal = resolveStart(null, picks);
  const startsAt = startLocal ? localToIso(startLocal) : null;
  const organiserName = host.name;
  const category = cleanCategory(form.get("category"));
  const description = cleanDescription(form.get("description"));
  const extrasOff = extrasOffFrom((n) => form.get(n) === "on");

  // Dibby seeds the vote: name and area can come from what you're after, if you left them blank.
  if (where === "dibby") {
    const ask = String(form.get("ask") ?? "").replace(/^\s*@dibby\s*/i, "").trim().slice(0, 500);
    if (!ask && !picks.spend) return { error: "Tell Dibby what you're after, like “dumplings” or “bowling”.", field: "ask" };
    if (!process.env.ANTHROPIC_API_KEY) return { error: "Dibby can't find places just yet. Pick a place, or vote on it and add your own." };
    let draft;
    try {
      draft = await draftPlan([title, ask].filter(Boolean).join(": "), vibe, picks);
    } catch (e) {
      report("dibby draft", e);
      return { error: "brb, Dibby's having a moment. Try again, or add your own places." };
    }
    const plan = await store.createPlan({
      ...(await host.ids()),
      organiserName,
      category,
      description,
      extrasOff,
      title: title || draft.title,
      area: clean(form.get("area"), 80) || draft.area,
      startsAt: startsAt ?? (draft.startsAtLocal ? localToIso(draft.startsAtLocal) : null),
      vibe,
      plusOnes,
    });
    for (const v of draft.venues) await store.addOption({ planId: plan.id, label: v.name, placeId: v.placeId, note: v.address });
    const members = await store.listMembers(plan.id);
    const organiser = members.find((m) => m.role === "organiser") ?? null;
    await store.addMessage({ planId: plan.id, memberId: organiser?.id ?? null, kind: "text", body: `@dibby ${[ask, picksLabel(picks)].filter(Boolean).join(" · ")}`, mentionsDibby: true });
    await store.addMessage({
      planId: plan.id,
      memberId: null,
      kind: "system",
      body: "Heads up: messages that tag @dibby are sent to an AI provider so Dibby can reply. Dibby only reads messages it's tagged in.",
    });
    await afterCreate(host, category);
    const tail = draft.venues.length ? "Vote's open for 24 hours." : "Couldn't find spots for that on Maps, so add a few from the map and the vote opens.";
    await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: `${draft.reply} ${tail}`, template: withPlaces(null, draft.venues.map((v) => v.placeId)) });
    redirect(await landingFor(host, plan.slug));
  }

  if (!title) return { error: "Give it a name, like “Friday dinner”.", field: "title" };

  // "Already decided": a real business from the map, or a place typed in, and the plan starts locked to it.
  let venue: { placeId: string | null; name: string; address: string | null } | null = null;
  if (where === "place") {
    const custom = form.has("venue_custom_name") ? cleanCustomPlace(form.get("venue_custom_name"), form.get("venue_custom_address")) : null;
    if (custom) venue = { placeId: null, name: custom.name, address: custom.address };
    else {
      const place = await getPlace(String(form.get("venue_place_id") ?? ""));
      if (!place) return { error: "Pick the place on the map or type it in, or start a poll.", field: "place" };
      venue = { placeId: place.placeId, name: place.name, address: null };
    }
  }

  const plan = await store.createPlan({
    ...(await host.ids()),
    organiserName,
    category,
    description,
    extrasOff,
    title,
    area: venue ? null : clean(form.get("area"), 80) || null,
    startsAt,
    vibe,
    plusOnes,
    venue,
  });
  await afterCreate(host, category);
  redirect(await landingFor(host, plan.slug));
}

type Host = {
  name: string;
  /** Who goes on the plan as organiser. For a new guest this sets the device cookie, so it's
   *  only called once the rest of the form checks out. */
  ids: () => Promise<{ organiserUserId: string | null; organiserGuestId: string | null }>;
  userId: string | null;
  savedCategories: string[];
  /** A guest who'd like their plans kept: the sign-in link goes here once the plan exists. */
  email: string | null;
};

/**
 * Like checking out as a guest: a signed-in organiser makes the plan as themselves; anyone else
 * just gives their name, with an email only if they want to keep it.
 */
async function whoIsOrganising(form: FormData): Promise<Host | { error: string; field: string }> {
  const me = await currentOrganiser();
  if (me) {
    const profile = await store.getProfile(me.id);
    if (!profile) redirect("/onboarding?next=/");
    return {
      name: `${profile.first_name} ${profile.last_name}`,
      ids: async () => ({ organiserUserId: me.id, organiserGuestId: null }),
      userId: me.id,
      savedCategories: profile.plan_categories ?? [],
      email: null,
    };
  }
  const email = clean(form.get("email"), 200).toLowerCase() || null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email doesn't look right. Leave it blank to skip it.", field: "email" };
  const guest = await currentGuest();
  if (guest) {
    return {
      name: `${guest.first_name} ${guest.last_name}`,
      ids: async () => ({ organiserUserId: null, organiserGuestId: guest.id }),
      userId: null,
      savedCategories: [],
      email,
    };
  }
  const first = clean(form.get("first_name"), 40);
  const last = clean(form.get("last_name"), 40);
  if (!first) return { error: "Add your first name.", field: "first_name" };
  if (!last) return { error: "Add your last name.", field: "last_name" };
  let made: Guest | null = null;
  return {
    name: `${first} ${last}`,
    ids: async () => {
      made ??= await createGuestSession(first, last);
      return { organiserUserId: null, organiserGuestId: made.id };
    },
    userId: null,
    savedCategories: [],
    email,
  };
}

/** A made-up category becomes a preset, but only for an account and only once the plan exists. */
async function afterCreate(host: Host, category: string | null) {
  if (host.userId && category) {
    const next = rememberCategory(host.savedCategories, category);
    if (next.join("\n") !== host.savedCategories.join("\n")) {
      try {
        await store.setSavedCategories(host.userId, next);
      } catch (e) {
        report("save category", e);
      }
    }
  }
}

/** On to "share it", the last step. A guest who left an email gets the keep-your-plans link on the way. */
async function landingFor(host: Host, slug: string): Promise<string> {
  const made = `/p/${slug}/made`;
  if (!host.email) return made;
  const guest = await currentGuest();
  if (!guest) return made;
  try {
    await store.setGuestEmail(guest.id, host.email);
  } catch (e) {
    report("keep plans email", e);
    return made;
  }
  if (!usingSupabase) return made;
  const sent = await sendLink(host.email, `/p/${slug}`);
  return sent?.sent ? `${made}?kept=1` : made;
}

/** The Ask Dibby chips. Anything malformed is dropped rather than guessed at. */
function readPicks(form: FormData): DraftPicks {
  const date = String(form.get("pick_date") ?? "");
  const time = String(form.get("pick_time") ?? "");
  const spend = Number(form.get("pick_spend"));
  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null,
    spend: spend === 1 || spend === 2 || spend === 3 ? spend : null,
    near: readNear(form),
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

