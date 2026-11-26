import { apiError, apiJson, apiOrganiser } from "@/lib/api-auth";
import { CrewError, leave } from "@/lib/crew-ops";

export const dynamic = "force-dynamic";

/** Leave the crew. The owner hands over first, unless they're the last one (then the crew goes). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const { id } = await params;
  try {
    return apiJson(await leave(id, me.id));
  } catch (e) {
    if (e instanceof CrewError) return apiError(e.message, e.status);
    console.error("[api crews] leave", id, e);
    return apiError("Couldn't leave just then. Try again in a sec.", 500);
  }
}
