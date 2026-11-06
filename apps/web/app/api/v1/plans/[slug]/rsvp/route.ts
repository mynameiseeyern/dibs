import { apiError, apiJson, readBody } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { setRsvp } from "@/app/p/[slug]/actions";

export const dynamic = "force-dynamic";

/** `POST { rsvp: "in" | "maybe" | "out" }`: the web's `setRsvp` (capacity, waitlist, votes back). → `PlanDetail`. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = (await readBody(req)).rsvp;
  if (raw !== "in" && raw !== "maybe" && raw !== "out") return apiError("Pick in, maybe or can't go.", 400);
  return forApp(req, async () => {
    await setRsvp(slug, raw);
    const detail = await planDetail(slug);
    if (!detail) return apiError("This plan doesn't exist any more.", 404);
    if (!detail.me) return apiError("Join the plan first.", 403);
    return apiJson(detail);
  });
}
