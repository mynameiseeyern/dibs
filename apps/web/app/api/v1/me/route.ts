import { FILTERED_NOTE, isFiltered } from "@dibs/shared/moderation";
import type { Me } from "@dibs/shared/api";
import { apiError, apiJson, apiOrganiser, readBody, text } from "@/lib/api-auth";
import { track } from "@/lib/events";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Who's signed in on the phone. `name` is null for a new account. */
export async function GET(req: Request) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const profile = await store.getProfile(me.id).catch(() => null);
  const body: Me = { id: me.id, email: me.email, name: profile ? { first: profile.first_name, last: profile.last_name } : null };
  return apiJson(body);
}

/** `PUT { first, last }`: sign-up's name step, or changing it. Keeps any PayID they set on the web. */
export async function PUT(req: Request) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const body = await readBody(req);
  const first = text(body.first, 40);
  const last = text(body.last, 40);
  if (!first || !last) return apiError("We need your first and last name.", 400);
  if (isFiltered(first, last)) return apiError(FILTERED_NOTE, 400);
  const existing = await store.getProfile(me.id).catch(() => null);
  try {
    await store.upsertProfile({
      user_id: me.id,
      first_name: first,
      last_name: last,
      dob: existing?.dob ?? null,
      payid: existing?.payid ?? null,
      payid_name: existing?.payid ? `${first} ${last}` : null,
    });
  } catch (e) {
    console.error("[api me] save profile", me.id, e);
    return apiError("Couldn't save that. Try again in a sec.", 500);
  }
  if (!existing) {
    await track({ name: "account_created", userId: me.id, props: { via: "sign_up", app: true } });
    await store.answerBetaPrompt(me.id).catch(() => {});
  }
  const out: Me = { id: me.id, email: me.email, name: { first, last } };
  return apiJson(out);
}

/**
 * Delete my account, from the app (Apple requires it in-app). Same as the web's
 * `deleteAccountAction`: memberships become "Former member" so shared bills stay right.
 */
export async function DELETE(req: Request) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  try {
    await store.deleteAccount(me.id);
  } catch (e) {
    console.error("[api delete account]", e);
    return apiError("Couldn't delete it just then. Try again, or email hello@dibby.social and we'll do it.", 500);
  }
  return apiJson({ deleted: true });
}
