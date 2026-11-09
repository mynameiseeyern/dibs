import "server-only";
import { emailConfig, para, renderEmail, h1, sendEmail, senderFromEnv, esc } from "@dibs/email";
import { reasonLabel, type ReportKind, type ReportReason } from "@dibs/shared/moderation";
import { siteUrl } from "./site";
import { store } from "./store";

/** Who you've blocked and what you've reported. Empty rather than broken if the tables aren't there yet. */
export async function screenFor(person: string | null): Promise<{ blocked: Set<string>; reported: Set<string> }> {
  if (!person) return { blocked: new Set(), reported: new Set() };
  const [blocked, reported] = await Promise.all([
    store.listBlocks(person).catch(() => []),
    store.listReportedTargets(person).catch(() => []),
  ]);
  return { blocked: new Set(blocked.map((b) => b.person)), reported: new Set(reported) };
}

export async function isBanned(person: string | null, planId: string | null): Promise<boolean> {
  if (!person) return false;
  return store.isBanned(person, planId).catch(() => false);
}

export const BANNED_NOTE = "You can't do that here any more. Think that's a mistake? Email hello@dibby.social.";

/** Saves a report and tells us straight away, because Apple expects action within 24 hours. */
export async function fileReport(r: {
  kind: ReportKind;
  planId: string | null;
  targetId: string | null;
  targetPerson: string | null;
  reporter: string | null;
  reason: ReportReason;
  note: string | null;
  snapshot: string | null;
}): Promise<void> {
  await store.addReport(r);
  if (!emailConfig().ready) return;
  const site = siteUrl().replace(/\/$/, "");
  const sender = senderFromEnv(site);
  const label = reasonLabel(r.reason);
  const lines = [`What: ${r.kind}`, `Why: ${label}`, r.note && `Their note: ${r.note}`, r.snapshot && `It said: ${r.snapshot}`].filter(Boolean) as string[];
  const queue = `${site}/admin/reports`;
  const body = h1("Someone reported something") + lines.map((l) => para(esc(l))).join("") + para(`<a href="${esc(queue)}">Open the queue</a>. Act on it within 24 hours.`);
  try {
    await sendEmail({
      to: process.env.MODERATION_EMAIL || sender.contact,
      subject: `Dibby report: ${label}`,
      html: renderEmail({ sender, title: "Dibby report", preheader: label, body, footer: { reason: "You're getting this because you run Dibby's report queue." } }),
      text: [...lines, `Queue: ${queue}`].join("\n"),
    });
  } catch (e) {
    console.error("[report alert]", e);
  }
}
