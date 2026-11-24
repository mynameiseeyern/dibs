import { apiError, apiJson, readBody } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { toggleReaction } from "@/app/p/[slug]/actions";

export const dynamic = "force-dynamic";

/**
 * `POST { emoji }`: adds or takes back a reaction on a chat message, the web's `toggleReaction`
 * (an account on the plan, not read only; 👍 ❤️ 😂 🎉). → `PlanDetail`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const emoji = (await readBody(req)).emoji;
  if (typeof emoji !== "string") return apiError("Pick a reaction.", 400);
  return forApp(req, async () => {
    await toggleReaction(slug, id, emoji);
    const detail = await planDetail(slug);
    return detail ? apiJson(detail) : apiError("This plan doesn't exist any more.", 404);
  });
}
