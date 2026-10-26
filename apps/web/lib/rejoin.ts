import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { PlanMember } from "@dibs/shared/types";
import { rejoinMac } from "./guest";
import { siteUrl } from "./site";

// Getting back to your spot without an email (a lost incognito tab, a cleared browser).
//
// - Guest link (/r/g.<guestId>.<sig>): the guest's own, shown only to them. Brings back every
//   plan they're on. It doesn't change, so a saved copy keeps working.
// - Member link (/r/m.<memberId>.<sig>): a host makes it for one person on one plan. It only
//   moves that membership, so a host can't use it to become someone on other plans. The
//   signature covers who holds the spot now, so the link stops working once it's been used.

export type RejoinKey = { kind: "g" | "m"; id: string; sig: string };

const guestSig = (guestId: string) => rejoinMac(`g:${guestId}`);
const memberSig = (m: Pick<PlanMember, "id" | "guest_id">) => rejoinMac(`m:${m.id}:${m.guest_id ?? "none"}`);

export const guestRejoinUrl = (guestId: string) => `${siteUrl()}/r/g.${guestId}.${guestSig(guestId)}`;
export const memberRejoinUrl = (m: Pick<PlanMember, "id" | "guest_id">) => `${siteUrl()}/r/m.${m.id}.${memberSig(m)}`;

export function parseRejoinKey(raw: string): RejoinKey | null {
  const m = /^(g|m)\.([0-9a-f-]{36})\.([A-Za-z0-9_-]{27})$/i.exec(decodeURIComponent(raw));
  return m ? { kind: m[1] as "g" | "m", id: m[2].toLowerCase(), sig: m[3] } : null;
}

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const guestKeyOk = (k: RejoinKey) => k.kind === "g" && same(k.sig, guestSig(k.id));
export const memberKeyOk = (k: RejoinKey, m: Pick<PlanMember, "id" | "guest_id">) => k.kind === "m" && same(k.sig, memberSig(m));
