import { apiError, apiGuest, apiJson, apiOrganiser, readBody, text } from "@/lib/api-auth";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Expo push tokens look like ExponentPushToken[xxxxxxxx]. */
const TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/;

/**
 * `POST { token, platform }`: this phone wants push notifications, for whoever's signed in
 * (or its guest pass). Sent again on sign-in, so the phone moves onto the account.
 */
export async function POST(req: Request) {
  const body = await readBody(req);
  const token = text(body.token, 200);
  const platform = body.platform === "android" ? "android" : body.platform === "ios" ? "ios" : null;
  if (!TOKEN.test(token) || !platform) return apiError("That doesn't look like a push token.", 400);
  const [organiser, guest] = await Promise.all([apiOrganiser(req), apiGuest(req)]);
  if (!organiser && !guest) return apiError("Make or join a plan first.", 401);
  await store.savePushToken({ token, userId: organiser?.id ?? null, guestId: guest?.id ?? null, platform });
  return apiJson({ saved: true });
}

/** `DELETE { token }`: signing out, or notifications turned off. Holding the token is enough. */
export async function DELETE(req: Request) {
  const token = text((await readBody(req)).token, 200);
  if (TOKEN.test(token)) await store.removePushToken(token);
  return apiJson({ removed: true });
}
