import { apiError, apiOrganiser } from "@/lib/api-auth";
import { store } from "@/lib/store";
import { GET as account } from "../account/route";

export const dynamic = "force-dynamic";

/** `POST`: a new calendar link; the old one stops working (the web's resetCalendarLink). → `AccountInfo`. */
export async function POST(req: Request) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in to manage your calendar link.", 401);
  await store.calendarFeedToken(me.id, { reset: true });
  return account(req);
}
