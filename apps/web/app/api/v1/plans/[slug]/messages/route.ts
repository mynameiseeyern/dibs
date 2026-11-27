import { apiError, apiJson, readBody } from "@/lib/api-auth";
import { forApp, planDetail } from "@/lib/api-plan";
import { postMessage } from "@/app/p/[slug]/actions";
import { loadPlan } from "@/lib/viewer";
import { readCoords } from "@/lib/api-create-plan";

export const dynamic = "force-dynamic";

/**
 * `POST { body, ai_consent?, near? }`: a message in the plan's chat, the web's `postMessage` (tag @dibby and Dibby
 * replies, which takes a few seconds). Guests read along; an account posts. A message
 * tagging @dibby needs `ai_consent: true` (the person said OK), or it's refused. → `PlanDetail`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const req_ = await readBody(req);
  const body = req_.body;
  if (typeof body !== "string" || !body.trim()) return apiError("Type something first.", 400);
  return forApp(req, async () => {
    // The web tells guests to get the app; in the app, it's adding an email.
    const view = await loadPlan(slug);
    if (view?.me && !view.me.user_id) return apiError("Add your email to chat. One code, no password.", 403);
    const form = new FormData();
    form.set("body", body.slice(0, 2000));
    // The app asks before an @dibby message goes to the AI (components/dibby/ai-consent.tsx).
    if (req_.ai_consent === true) form.set("ai_consent", "1");
    // Where they are, so Dibby looks nearby (a search bias only, like the web's composer).
    const near = readCoords(req_.near);
    if (near) {
      form.set("near_lat", String(near.lat));
      form.set("near_lng", String(near.lng));
    }
    const res = await postMessage(slug, undefined, form);
    if (res?.error) return apiError(res.error, 403);
    const detail = await planDetail(slug);
    return detail ? apiJson(detail) : apiError("This plan doesn't exist any more.", 404);
  });
}
