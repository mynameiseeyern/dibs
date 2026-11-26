import { apiError, apiJson, apiOrganiser } from "@/lib/api-auth";
import { askToJoin, CrewError } from "@/lib/crew-ops";

export const dynamic = "force-dynamic";

/** Ask to join the crew behind an invite link. The owner or an admin says yes. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in to ask to join.", 401);
  const { token } = await params;
  try {
    return apiJson(await askToJoin(token, me.id));
  } catch (e) {
    if (e instanceof CrewError) return apiError(e.message, e.status);
    console.error("[api crews] ask to join", e);
    return apiError("Couldn't send that. Try again in a sec.", 500);
  }
}
