import { renderEmail, type Sender } from "./layout";
import { markdownToEmailHtml, markdownToText } from "./markdown";

export interface ReleaseNote {
  /** The file name without .md, e.g. 2026-10-23-roulette. Used to never send the same note twice. */
  id: string;
  subject: string;
  preheader: string;
  date: string;
  markdown: string;
}

/**
 * A release note file is markdown with a small header:
 *
 *   ---
 *   subject: Spin for the bill, now with everyone watching
 *   preheader: Roulette plays live for the whole crew, plus calendar invites.
 *   date: 2026-10-23
 *   ---
 */
export function parseReleaseNote(id: string, source: string): ReleaseNote {
  const m = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${id}: start the file with a --- header (subject, preheader, date).`);
  const meta = Object.fromEntries(
    m[1]!
      .split("\n")
      .map((line) => line.match(/^(\w+):\s*(.*)$/))
      .filter((x): x is RegExpMatchArray => !!x)
      .map((x) => [x[1]!, x[2]!.trim().replace(/^["']|["']$/g, "")]),
  );
  for (const key of ["subject", "preheader", "date"]) {
    if (!meta[key]) throw new Error(`${id}: the header needs a ${key}.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date!)) throw new Error(`${id}: date should look like 2026-10-23.`);
  return { id, subject: meta.subject!, preheader: meta.preheader!, date: meta.date!, markdown: m[2]!.trim() };
}

const eyebrowDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

export function renderReleaseNote(note: ReleaseNote, sender: Sender, links: { unsubscribeUrl: string; settingsUrl: string }) {
  const html = renderEmail({
    sender,
    title: note.subject,
    preheader: note.preheader,
    eyebrow: `Beta update · ${eyebrowDate(note.date)}`,
    body: markdownToEmailHtml(note.markdown),
    footer: {
      reason: "You're getting this because you said yes to dibs beta updates.",
      unsubscribeUrl: links.unsubscribeUrl,
      settingsUrl: links.settingsUrl,
    },
  });
  const text = [
    markdownToText(note.markdown),
    "",
    "—",
    "You're getting this because you said yes to dibs beta updates.",
    `Unsubscribe: ${links.unsubscribeUrl}`,
    `${sender.name} · ${sender.contact}`,
  ].join("\n");
  return { html, text };
}
