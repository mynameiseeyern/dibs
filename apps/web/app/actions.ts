"use server";

import { redirect } from "next/navigation";
import type { Vibe } from "@dibs/shared/types";
import { currentOrganiser, demoSignIn, signOut, supabaseAuth } from "@/lib/auth";
import { store, usingSupabase } from "@/lib/store";
import { localToIso } from "@/lib/time";

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
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await (await supabaseAuth()).auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: "Couldn't send the link. Try again in a sec." };
  return { sent: email };
}

export async function signOutAction() {
  await signOut();
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
  await store.upsertProfile({ user_id: me.id, first_name: first, last_name: last, dob, payid, payid_name: payid ? `${first} ${last}` : null });
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
