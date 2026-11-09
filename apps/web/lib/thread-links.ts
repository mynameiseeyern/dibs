// Dibby can point to another plan from a thread message. The link rides at the end of the
// message body as its own line, "→ /p/<slug>", and the thread renders it as a button.

export const DIBBY_HEADS_UP =
  "Heads up: when you tag @dibby, your message and the last 20 in this chat go to Anthropic, the AI company behind Dibby, so it can reply. Dibby doesn't do anything until it's tagged.";

const LINK_LINE = /\n→ \/p\/([A-Za-z0-9_-]+)\s*$/;

export const planLinkLine = (slug: string) => `→ /p/${slug}`;

/** Split a message into its text and an optional plan link. */
export function splitPlanLink(body: string): { text: string; slug: string | null } {
  const m = body.match(LINK_LINE);
  return m ? { text: body.slice(0, m.index), slug: m[1] } : { text: body, slug: null };
}
