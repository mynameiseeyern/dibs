import { DataSet, RegExpMatcher, englishDataset, englishRecommendedTransformers, pattern } from "obscenity";

/**
 * What people can post (Apple 1.2, Google's UGC policy). The filter only stops slurs and sexual
 * violence: mates swear at each other in group chats and that's fine. Everything else is dealt
 * with by reports, blocks and hosts.
 */
const NEVER_ALLOWED = new Set([
  "abo", "abeed", "africoon", "arabush", "boonga", "chingchong", "chink", "kike", "negro", "nigger", "retard", "spastic", "tranny",
  "rape", "bestiality", "incest",
]);

const severe = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .removePhrasesIf((p) => !NEVER_ALLOWED.has(p.metadata?.originalWord ?? ""))
  // Whole words only: the stock pattern also catches surnames like Fagan.
  // The stock pattern misses this one once doubled letters are collapsed.
  .addPhrase((p) => p.setMetadata({ originalWord: "tranny" }).addPattern(pattern`tran[n]y`))
  .addPhrase((p) => p.setMetadata({ originalWord: "fag" }).addPattern(pattern`|fag|`).addPattern(pattern`|fags|`).addPattern(pattern`faggot`));
const matcher = new RegExpMatcher({ ...severe.build(), ...englishRecommendedTransformers });

export const FILTERED_NOTE = "That's got a word that isn't allowed here. Mind rewording it?";

/** True when any of these strings has something that can't be posted. */
export function isFiltered(...texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => Boolean(t) && matcher.hasMatch(t!));
}

export const REPORT_KINDS = ["message", "photo", "plan", "member"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export const isReportKind = (v: unknown): v is ReportKind => REPORT_KINDS.includes(v as ReportKind);

export { REPORT_REASONS, isReportReason, reasonLabel, type ReportReason } from "./report-reasons";

/** One key for a person across plans, an account or a guest. Null for a former member. */
export function personKey(m: { user_id?: string | null; guest_id?: string | null }): string | null {
  return m.user_id ? `u:${m.user_id}` : m.guest_id ? `g:${m.guest_id}` : null;
}

/** Whether someone can delete this message: their own, or a host's call. Dibby's and system lines stay. */
export function canDeleteMessage(message: { kind: string; member_id: string | null }, me: { id: string }, isHost: boolean): boolean {
  if (message.kind !== "text") return false;
  return message.member_id === me.id || isHost;
}

/** Whether a host can put this person off the plan. Never themselves or the organiser. */
export function canEject(target: { id: string; role: string }, me: { id: string }, isHost: boolean): boolean {
  return isHost && target.id !== me.id && target.role !== "organiser";
}
