// Reading a plan out of what someone typed to Dibby: "dumplings fri arvo near Newtown".
// No AI here. Only words the person actually typed become a day, a time or an area, the same
// as tapping that chip, so Dibby never makes up a day or a time. Pure, so it's tested.

import { sydneyDate } from "./when";
import { TIME_PRESETS } from "./daypart";

export interface PlanText {
  /** "Dumplings with the crew": what's left once the day, time and area are taken out. */
  title: string | null;
  /** One of PLAN_CATEGORIES' labels, when a word gives it away. */
  category: string | null;
  /** "2026-11-06", Sydney. */
  date: string | null;
  /** "15:00". */
  time: string | null;
  /** "Newtown". */
  area: string | null;
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAY_WORDS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Parts of the day, by the words people use. Same times as the quick-time chips. */
const PART_WORDS: [RegExp, string][] = [
  [/\bsuper early\b/, "Super early"],
  [/\b(this )?morning\b/, "Morning"],
  [/\b(midday|noon)\b/, "Midday"],
  [/\b(this )?(arvo|afternoon)\b/, "Arvo"],
  [/\b(this )?evening\b/, "Evening"],
  [/\blate( night)?\b/, "Late"],
  [/\bnight\b/, "Night"],
];
const presetAt = (label: string) => TIME_PRESETS.find((p) => p.label === label)!.at;

/** Words that give the kind of plan away, first match wins. Labels match PLAN_CATEGORIES. */
const CATEGORY_WORDS: [RegExp, string][] = [
  [/\b(coffee|cafe|café|matcha)\b/, "Coffee"],
  [/\b(drinks?|beers?|pub|bar|cocktails?|wine|bevs?|sesh)\b/, "Drinks"],
  [/\b(dinner|lunch|brunch|breakfast|food|eat|dumplings?|ramen|pho|pizza|tacos?|sushi|burgers?|yum cha|bbq|kbbq|hot ?pot|curry|thai|korean|indian|pasta)\b/, "Food"],
  [/\b(parkrun|run|running|jog)\b/, "Run"],
  [/\b(walk|hike|coastal)\b/, "Walk"],
  [/\b(footy|basketball|tennis|soccer|futsal|bouldering|climbing|volleyball|pickleball|golf|gym|swim)\b/, "Sport"],
  [/\b(board games?|games?|bowling|mini golf|arcade|karaoke|trivia|escape room)\b/, "Games"],
  [/\b(beach|movie|movies|party|birthday|bday|picnic|hang|catch ?up|bonfire)\b/, "Social"],
];

/** Openers that aren't part of the plan's name. */
const FILLER = /^(?:hey dibby|dibby|ok|okay|so|um+|yo)[,!.\s]+|^(?:let'?s|lets|we should|should we|wanna|want to|keen (?:for|to)|keen on|i'?m keen (?:for|to|on)|let me|how about|maybe)\s+/i;

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const weekday = (ymd: string) => new Date(`${ymd}T00:00:00Z`).getUTCDay();

/** "7pm", "7:30 pm", "19:30" (with a colon), as "HH:MM". */
function clockTime(h: number, m: number, ampm: string | undefined): string | null {
  if (m > 59) return null;
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
  } else if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const titleCase = (s: string) => s.replace(/\b([a-z])/g, (c) => c.toUpperCase());

/**
 * Pull a day, a time, an area and a name out of a message. Anything not said stays null.
 * `now` decides what "today" and "fri" mean, in Sydney.
 */
export function readPlanText(input: string, now = new Date()): PlanText {
  const raw = input.replace(/\s+/g, " ").trim();
  const today = sydneyDate(now);
  // Matched bits are cut out of this copy, and what's left becomes the name.
  let rest = ` ${raw} `;
  const cut = (re: RegExp) => {
    rest = rest.replace(re, " ");
  };
  const lower = raw.toLowerCase();

  let date: string | null = null;
  let time: string | null = null;

  // Day
  let m: RegExpMatchArray | null;
  if ((m = lower.match(/\btonight\b/))) {
    date = today;
    time = presetAt("Night");
    cut(/\btonight\b/i);
  } else if ((m = lower.match(/\b(today|tdy)\b/))) {
    date = today;
    cut(/\b(today|tdy)\b/i);
  } else if ((m = lower.match(/\b(tomorrow|tmrw|tmr|tmoz|tomoz)\b/))) {
    date = addDays(today, 1);
    cut(/\b(tomorrow|tmrw|tmr|tmoz|tomoz)\b/i);
  } else if ((m = lower.match(/\b(this |next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues|tue|weds|wed|thurs|thur|thu|fri|sat)\b/))) {
    const want = DAY_WORDS[m[2] ?? ""] ?? 0;
    let ahead = (want - weekday(today) + 7) % 7;
    if (m[1] === "next " && ahead === 0) ahead = 7;
    date = addDays(today, ahead);
    cut(new RegExp(`\\b(this |next )?${m[2]}\\b`, "i"));
  } else if ((m = lower.match(/\b(this |next )?weekend\b/))) {
    let ahead = (6 - weekday(today) + 7) % 7;
    if (weekday(today) === 0) ahead = m[1] === "next " ? 6 : 0; // Sunday is still this weekend
    if (m[1] === "next " && weekday(today) !== 0) ahead += 7;
    date = addDays(today, ahead);
    cut(/\b(this |next )?weekend\b/i);
  } else if ((m = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?(?: of)? (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/)) || (m = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})(?:st|nd|rd|th)?\b/))) {
    const [day, mon] = /^\d/.test(m[1] ?? "") ? [Number(m[1]), m[2] ?? ""] : [Number(m[2]), m[1] ?? ""];
    date = nextDate(today, MONTHS.indexOf(mon.slice(0, 3)) + 1, day);
    if (date) cut(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  } else if ((m = lower.match(/\b(\d{1,2})\/(\d{1,2})\b/))) {
    // Australian order: day/month.
    date = nextDate(today, Number(m[2]), Number(m[1]));
    if (date) cut(new RegExp(`\\b${m[1]}/${m[2]}\\b`));
  }

  // Time: a clock time beats a part of the day.
  if ((m = lower.match(/\b(\d{1,2})(?::(\d{2}))? ?(am|pm)\b/)) || (m = lower.match(/\b(\d{1,2}):(\d{2})\b/))) {
    const t = clockTime(Number(m[1]), Number(m[2] ?? 0), m[3]);
    if (t) {
      time = t;
      cut(new RegExp(`\\b(at |@ ?)?${m[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
    }
  }
  for (const [re, label] of PART_WORDS) {
    const hit = lower.match(re);
    if (!hit) continue;
    if (!time) time = presetAt(label);
    cut(new RegExp(re.source, "i"));
    break;
  }

  // Area: "near newtown", "around Surry Hills", "in Bondi" (a capital needed after "in": "in the
  // park" isn't an area). Stops at the next small word.
  let area: string | null = null;
  const near = rest.match(/\b(?:near|around|nr)\s+([a-z][\w'-]*(?:\s+(?!(?:on|at|with|for|and|this|next|or|but|then|after|before)\b)[a-z][\w'-]*){0,2})/i);
  const inArea = rest.match(/\bin\s+([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*){0,2})/);
  const hit = near ?? inArea;
  if (hit) {
    area = titleCase((hit[1] ?? "").toLowerCase()).slice(0, 80);
    rest = rest.replace(hit[0], " ");
  }

  // Category
  let category: string | null = null;
  for (const [re, label] of CATEGORY_WORDS) {
    if (re.test(lower)) {
      category = label;
      break;
    }
  }

  // Name: what's left, tidied.
  let title = rest
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
  for (let i = 0; i < 3; i++) title = title.replace(FILLER, "").trim();
  title = title.replace(/^(?:on|at|for|and)\s+|\s+(?:on|at|for|and)$/gi, "").replace(/^[,.!?\s-]+|[,.!?\s-]+$/g, "").trim();
  title = title ? (title.charAt(0).toUpperCase() + title.slice(1)).slice(0, 80) : "";

  return { title: title || null, category, date, time, area };
}

/** The next time this day of this month comes round, today included. Null if it's not a real day. */
function nextDate(today: string, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let year = Number(today.slice(0, 4));
  const make = (y: number) => {
    const d = new Date(Date.UTC(y, month - 1, day));
    return d.getUTCMonth() === month - 1 ? d.toISOString().slice(0, 10) : null;
  };
  let d = make(year);
  if (!d) return null;
  if (d < today) d = make(++year);
  return d;
}

/** True when the message is someone saying "not sure" about the day. */
export const saysLater = (text: string) => /\b(later|not sure|dunno|idk|tbd|tbc|no idea|decide later|whenever|skip)\b/i.test(text);

export const dayShort = (ymd: string) => DAYS[weekday(ymd)];
