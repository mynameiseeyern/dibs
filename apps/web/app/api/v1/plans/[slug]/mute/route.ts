import { apiError, apiJson } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { toggleDibbyMute } from "@/app/p/[slug]/actions";

export const dynamic = "force-dynamic";

/** `POST`: the bell on the chat. Mutes or unmutes Dibby's nudges for this person, the web's `toggleDibbyMute`. → `PlanDetail`. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return forApp(req, async () => {
    await toggleDibbyMute(slug);
    const detail = await planDetail(slug);
    return detail ? apiJson(detail) : apiError("This plan doesn't exist any more.", 404);
  });
}
