import { isReportKind, isReportReason, personKey } from "@dibs/shared/moderation";
import { apiError, apiGuest, apiJson, apiOrganiser, readBody, text } from "@/lib/api-auth";
import { fileReport } from "@/lib/moderation";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * `POST { kind, target_id?, reason, note?, block? }`: report a plan or something on it from the
 * phone. `block` also blocks whoever it's about, so their plans drop out of the app for you.
 * → `{ reported: true }`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const plan = await store.getPlanBySlug((await params).slug);
  if (!plan) return apiError("This plan doesn't exist any more.", 404);
  const body = await readBody(req);
  if (!isReportKind(body.kind) || !isReportReason(body.reason)) return apiError("Pick what's wrong with it.", 400);
  const me = await apiOrganiser(req);
  const guest = me ? null : await apiGuest(req);
  const reporter = me ? `u:${me.id}` : guest ? `g:${guest.id}` : null;

  const members = await store.listMembers(plan.id);
  const targetId = body.kind === "plan" ? plan.id : text(body.target_id, 64);
  let snapshot = "";
  let about = members.find((m) => m.role === "organiser") ?? null;
  if (body.kind === "plan") snapshot = [plan.title, plan.description].filter(Boolean).join(": ");
  else if (body.kind === "member") {
    about = members.find((m) => m.id === targetId) ?? null;
    if (!about) return apiError("They've already left.", 404);
    snapshot = about.display_name;
  } else if (body.kind === "message") {
    const msg = (await store.listMessages(plan.id, 500)).find((m) => m.id === targetId);
    if (!msg) return apiError("That's already gone.", 404);
    about = members.find((m) => m.id === msg.member_id) ?? null;
    snapshot = msg.body;
  } else {
    const photo = (await store.listPhotos(plan.id)).find((p) => p.id === targetId);
    if (!photo) return apiError("That's already gone.", 404);
    about = members.find((m) => m.id === photo.member_id) ?? null;
    snapshot = "A photo";
  }
  const person = about ? personKey(about) : null;

  try {
    await fileReport({ kind: body.kind, planId: plan.id, targetId, targetPerson: person, reporter, reason: body.reason, note: text(body.note, 500) || null, snapshot: snapshot.slice(0, 2000) });
    if (body.block === true && reporter && person && person !== reporter) await store.addBlock(reporter, person, about!.display_name);
  } catch (e) {
    console.error("[api report]", e);
    return apiError("Couldn't send that just then. Try again, or email hello@dibby.social.", 500);
  }
  return apiJson({ reported: true });
}
