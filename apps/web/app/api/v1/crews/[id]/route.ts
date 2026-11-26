import { apiError, apiJson, apiOrganiser } from "@/lib/api-auth";
import { crewDetail } from "@/lib/crew-ops";

export const dynamic = "force-dynamic";

/** The crew: members, and for the owner and admins, requests and everyone's links. Members only. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const { id } = await params;
  try {
    const detail = await crewDetail(id, me.id);
    return detail ? apiJson(detail) : apiError("Couldn't find that crew.", 404);
  } catch (e) {
    console.error("[api crews] detail", id, e);
    return apiError("Couldn't load the crew. Try again in a sec.", 500);
  }
}
