import type { Vibe } from "@dibs/shared/types";

// Every line of app copy that follows a plan's vibe (ARV-28): Chill (default), Extra, Straight up.
// Rules for every vibe: short, Australian spelling, money kind and specific, never pushy.
// Straight up has no banter and no emoji.
//
// Dibby's automatic messages are stored as a template plus details (`messages.template`),
// so the thread re-renders them in the plan's current vibe: flip the vibe and the same
// messages change tone.

export const VIBES: { id: Vibe; label: string; hint: string }[] = [
  { id: "chill", label: "Chill", hint: "Casual and warm, a little cheeky." },
  { id: "extra", label: "Extra", hint: "Hyped, playful, emoji welcome." },
  { id: "straight", label: "Straight up", hint: "Plain and clear. No banter." },
];

/** "Tom", "Tom and Priya", "Tom, Priya and Jess", "Tom, Priya, Jess and 2 others". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length <= 3) return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  const rest = names.length - 3;
  return `${names.slice(0, 3).join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}`;
}

const v3 = (vibe: Vibe, chill: string, extra: string, straight: string) => (vibe === "extra" ? extra : vibe === "straight" ? straight : chill);

// ---------- Dibby's automatic messages ----------

export type Template =
  | { k: "rsvp"; title: string; names: string[] }
  | { k: "vote_closing"; mins: number; ranked: { label: string; votes: number }[] }
  /** `after`: what opens at wrap-up, from the plan's extras. Missing (older messages): bills and recap. */
  | { k: "wrap_up"; host: string; after?: { bills: boolean; recap: boolean } }
  | { k: "day_before"; when: string; where: string | null; coming: number }
  | { k: "maybe"; title: string; names: string[] }
  | { k: "bail"; name: string }
  | { k: "roulette"; bill: string; name: string; payerSpun: boolean }
  | { k: "locked"; winner: string; tie: boolean; deadline: boolean };

export function renderTemplate(t: Template, vibe: Vibe): string {
  switch (t.k) {
    case "rsvp": {
      const who = listNames(t.names);
      const you = t.names.length === 1 ? "You" : t.names.length === 2 ? "You two" : "You lot";
      return v3(
        vibe,
        `Still waiting on ${who} for ${t.title}. ${you} in?`,
        `${who}, the crew is waiting on you 👀 are you in for ${t.title}? 🙏`,
        `${who} ${t.names.length === 1 ? "hasn't" : "haven't"} replied to ${t.title} yet.`
      );
    }
    case "vote_closing": {
      const when = t.mins >= 55 ? "in an hour" : `in ${t.mins} ${t.mins === 1 ? "minute" : "minutes"}`;
      const [top, second] = t.ranked;
      if (!top || top.votes === 0)
        return v3(vibe, `Voting closes ${when} and no one's voted yet. Get a tap in.`, `voting closes ${when} and NOBODY has voted 😭 tap something, anything`, `Voting closes ${when}. No votes yet.`);
      const tied = t.ranked.filter((r) => r.votes === top.votes);
      if (tied.length > 1) {
        const between = listNames(tied.map((x) => x.label));
        return v3(vibe, `Dead heat between ${between}. Voting closes ${when}, so tip it.`, `it's neck and neck between ${between} 😤 voting closes ${when}, settle it`, `Voting closes ${when}. Tied: ${between} (${top.votes} each).`);
      }
      const score = second ? `${top.votes} to ${second.votes}` : `${top.votes} ${top.votes === 1 ? "vote" : "votes"}`;
      return v3(
        vibe,
        `${top.label}'s winning ${score}. Voting closes ${when}.`,
        `voting closes ${when} 🗳️ ${top.label}'s out in front ${score}, don't be the reason we end up somewhere worse 😭`,
        `Voting closes ${when}. Leading: ${top.label} (${top.votes} ${top.votes === 1 ? "vote" : "votes"}).`
      );
    }
    case "wrap_up": {
      const { bills = true, recap = true } = t.after ?? {};
      if (!bills && !recap)
        return v3(
          vibe,
          `Hope it was a good one. ${t.host}, tap "Wrap it up" when you get a sec.`,
          `how good was that 🥹 ${t.host}, hit "Wrap it up" when you're ready ✨`,
          `${t.host}: please wrap up the plan.`
        );
      const what = bills && recap ? "bills and the recap" : bills ? "bills" : "the recap";
      return v3(
        vibe,
        bills ? `Hope it was a good one. ${t.host}, tap "Wrap it up" when you get a sec so everyone can square up.` : `Hope it was a good one. ${t.host}, tap "Wrap it up" when you get a sec so everyone can do the recap.`,
        bills && recap
          ? `how good was that 🥹 ${t.host}, hit "Wrap it up" so the crew can square up and spill the recap ✨`
          : bills
            ? `how good was that 🥹 ${t.host}, hit "Wrap it up" so the crew can square up ✨`
            : `how good was that 🥹 ${t.host}, hit "Wrap it up" so the crew can spill the recap ✨`,
        `${t.host}: please wrap up the plan so ${what} can open.`
      );
    }    case "day_before": {
      const place = t.where ? `, ${t.where}` : "";
      const n = `${t.coming} coming`;
      return v3(vibe, `${t.when}${place}. ${n}. See you there.`, `${t.when}${place} 📍 ${n}, it's happening 🎉`, `Reminder: ${t.when}${place}. ${n}.`);
    }
    case "maybe": {
      const who = listNames(t.names);
      const still = t.names.length === 1 ? "still a maybe" : "still maybes";
      return v3(
        vibe,
        `${who}, ${still} for ${t.title}? In or out, either's fine, just helps with numbers.`,
        `${who}, ${still} for ${t.title}?? 👀 in or out, no judgement (some judgement)`,
        `${who}: you're marked as maybe for ${t.title}. Please confirm in or out.`
      );
    }
    case "bail":
      return v3(vibe, `${t.name}'s had to pull out 😢 Still on, or push it to another day?`, `nooo ${t.name} has bailed 😭 still on, or should we push it?`, `${t.name} can't make it any more. The plan is still on unless the host changes it.`);
    case "roulette":
      return v3(
        vibe,
        t.payerSpun ? `Spun it. ${t.name} already paid for ${t.bill} and it's staying that way. Legend 🎉` : `Spun it. ${t.name}'s shouting ${t.bill} 🎉 Next round's on someone else.`,
        `THE WHEEL HAS SPOKEN 🎡 ${t.name} is shouting ${t.bill} 💀 legend`,
        `The wheel picked ${t.name} to pay for ${t.bill}.`
      );
    case "locked":
      if (t.tie)
        return v3(vibe, `It was a tie, so I spun for it: ${t.winner}. See you there.`, `dead heat so I spun the wheel 🎡 ${t.winner} wins, see you there 🥳`, `The vote was tied. Picked at random: ${t.winner}.`);
      return v3(
        vibe,
        `${t.deadline ? "Voting's closed. " : ""}Locked in: ${t.winner}. See you there.`,
        `IT'S DECIDED 🎉 ${t.winner} it is, see you there 🥳`,
        `${t.deadline ? "Voting closed. " : ""}Locked in: ${t.winner}.`
      );
  }
}

// ---------- App copy ----------

export type RsvpState = "in" | "maybe" | "out" | "waitlist" | "none";

export function rsvpHeading(vibe: Vibe, s: RsvpState): string {
  switch (s) {
    case "in":
      return v3(vibe, "You're in. Nice.", "YOU'RE IN 🎉", "You're going.");
    case "maybe":
      return v3(vibe, "You're a maybe", "a maybe?? 👀", "You're marked as maybe.");
    case "out":
      return v3(vibe, "You can't make it", "noooo, you're out 😢", "You're not going.");
    case "waitlist":
      return v3(vibe, "You're on the waitlist", "on the waitlist, fingers crossed 🤞", "You're on the waitlist.");
    default:
      return v3(vibe, "Are you in?", "you in or what? 👀", "Are you going?");
  }
}

export const youOwe = (vibe: Vibe, amount: string) => v3(vibe, `You owe ${amount}.`, `you owe ${amount}, whenever you're ready 🙏`, `You owe ${amount}.`);
export const owedToYou = (vibe: Vibe, amount: string) => v3(vibe, `${amount} still to come back to you.`, `${amount} coming back your way 💰`, `${amount} outstanding to you.`);
export const allSquare = (vibe: Vibe) => v3(vibe, "Everyone's paid back. Nice work, crew.", "EVERYONE'S SQUARE 🥳 love that for us", "All shares are paid.");

// ---------- Private money reminders (shown only to the person, never posted) ----------

export function oweReminder(vibe: Vibe, amount: string, payer: string, billTitle: string, again: boolean): string {
  if (vibe === "extra") return again ? `hey bestie, ${amount} to ${payer} for ${billTitle} is still open 🙏 whenever you can` : `psst 👀 ${amount} to ${payer} for ${billTitle} whenever you get a sec`;
  if (vibe === "straight") return `${amount} to ${payer} for ${billTitle} is still unpaid.`;
  return again ? `Still open: ${amount} to ${payer} for ${billTitle}. No stress, whenever you can.` : `Hey, ${amount} to ${payer} for ${billTitle} whenever you get a sec.`;
}

export function tellPayer(vibe: Vibe, names: string[]): string {
  const who = listNames(names);
  const has = names.length === 1 ? "hasn't" : "haven't";
  if (vibe === "straight") return `${who} ${has} marked their share as paid yet.`;
  return `${who} ${has} paid you back yet. Only you can see this. A friendly text usually does it.`;
}

/** Read a stored template safely; anything unrecognised falls back to the message text. */
export function asTemplate(raw: unknown): Template | null {
  if (!raw || typeof raw !== "object" || typeof (raw as { k?: unknown }).k !== "string") return null;
  const k = (raw as { k: string }).k;
  return ["rsvp", "vote_closing", "wrap_up", "day_before", "maybe", "bail", "roulette", "locked"].includes(k) ? (raw as Template) : null;
}

// ---------- Ask Dibby: the line that rewrites itself as you fill the form ----------

export interface AskParts {
  ask: string;
  day: string | null; // "today", "tomorrow", "Sat 24"
  time: string | null; // "brunch", "dinner"…
  spend: 1 | 2 | 3 | null;
  near: boolean;
}

const SPEND_WORDS: Record<1 | 2 | 3, [string, string, string]> = {
  1: ["cheap and cheerful", "cheap n cheerful 🤑", "budget"],
  2: ["mid-range", "not too spenny", "mid-range"],
  3: ["a bit fancy", "treat ourselves 💅", "upmarket"],
};

/** What Dibby says back while you fill in the form. Never invents a day or time: only echoes what's tapped. */
export function askDibbyLine(vibe: Vibe, p: AskParts): string {
  const what = p.ask.trim();
  const when = [p.time, p.day].filter(Boolean).join(" ");
  const whenCap = when ? when.charAt(0).toUpperCase() + when.slice(1) : "";
  const spend = p.spend ? SPEND_WORDS[p.spend][vibe === "chill" ? 0 : vibe === "extra" ? 1 : 2] : null;
  const where = p.near ? "near you" : null;
  const bits = [spend, where].filter(Boolean).join(", ");
  const setup = whenCap ? `${whenCap}${bits ? `, ${bits}` : ""}.` : bits ? `${bits.charAt(0).toUpperCase() + bits.slice(1)}.` : "";

  if (!what && !setup) {
    return v3(vibe, "Tell me what you're after and I'll find three spots.", "what are we doing?? 👀 gimme a vibe and I'll find three spots", "Describe the outing. I will suggest three venues.");
  }
  const ask = what ? v3(vibe, `${what}? Say less, I'll find three.`, `${what}?? SAY LESS 🔥 finding three now`, `${what}. I will suggest three venues.`) : v3(vibe, "Tell me what you're after and I'll find three.", "now tell me what we're eating 👀", "Describe the outing.");
  return [setup, ask].filter(Boolean).join(" ");
}
