import type { MonogramColour, PlanMember, Rsvp } from "./types";
import { MONOGRAM_COLOURS } from "./types";

const SLUG_CHARS = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i

/** Short, unguessable-enough plan slug for links: /p/k7m2qx9a */
export function makeSlug(length = 8, random: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < length; i++) s += SLUG_CHARS[Math.floor(random() * SLUG_CHARS.length)];
  return s;
}

/** First letters of first and last name, e.g. "Sam Lee" -> "SL". */
export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

/**
 * Picks a monogram colour so two people with the same initials on one plan look different.
 */
export function pickColour(name: string, taken: readonly { display_name: string; colour: MonogramColour }[]): MonogramColour {
  const mine = monogram(name);
  const clashing = new Set(taken.filter((m) => monogram(m.display_name) === mine).map((m) => m.colour));
  const counts = new Map<MonogramColour, number>(MONOGRAM_COLOURS.map((c) => [c, 0]));
  for (const m of taken) counts.set(m.colour, (counts.get(m.colour) ?? 0) + 1);
  const free = MONOGRAM_COLOURS.filter((c) => !clashing.has(c));
  const pool = free.length ? free : [...MONOGRAM_COLOURS];
  return pool.sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0]!;
}

export function countIn(members: readonly Pick<PlanMember, "rsvp" | "plus_one" | "waitlisted">[]): number {
  return members.filter((m) => m.rsvp === "in" && !m.waitlisted).reduce((n, m) => n + 1 + (m.plus_one ? 1 : 0), 0);
}

/** Whether a new "in" RSVP fits, or goes on the waitlist. */
export function hasRoom(members: Parameters<typeof countIn>[0], capacity: number, plusOne = false): boolean {
  return countIn(members) + 1 + (plusOne ? 1 : 0) <= capacity;
}

export const RSVP_LABEL: Record<Rsvp, string> = { in: "I'm in", maybe: "Maybe", out: "Can't go" };

/** Prefilled WhatsApp message. Short, then the link. */
export function shareText(opts: { title: string; deadline?: string | null; url: string }): string {
  const by = opts.deadline ? ` Vote + RSVP by ${opts.deadline}` : " Vote + RSVP";
  return `${opts.title} is on.${by} 👉 ${opts.url}`;
}
