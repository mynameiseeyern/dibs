import { store } from "@/lib/store";
import { feedIcs } from "@/lib/calendar";
import { feedStatus } from "@dibs/shared/calendar";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Someone's calendar subscription (/cal/<token>.ics). Calendar apps fetch it with no session,
 * so the token is the only key: an unknown or reset token gets a plain 404.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const token = /^([A-Za-z0-9_-]{20,64})\.ics$/.exec(file)?.[1];
  const userId = token ? await store.userForCalendarToken(token) : null;
  if (!userId) return new Response("Not found", { status: 404 });

  const base = siteUrl();
  const events = (await store.listPlansForUser(userId)).flatMap(({ plan, member }) => {
    const status = feedStatus(plan, member);
    // They're in the plan, so a typed-in place's address can go in, like on the plan card.
    return status ? [{ plan, url: `${base}/p/${plan.slug}`, status }] : [];
  });
  return new Response(feedIcs(events), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="dibby-plans.ics"',
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
