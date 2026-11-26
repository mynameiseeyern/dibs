import { apiError, apiJson, apiOrganiser, readBody } from "@/lib/api-auth";
import { CrewError, removeFromCrew, setMemberRole } from "@/lib/crew-ops";

export const dynamic = "force-dynamic";

/** `POST { role: "admin" | "member" | "owner" }`: make or remove an admin, or hand the crew over. Owner only. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const { id, userId } = await params;
  const { role } = await readBody(req);
  if (role !== "admin" && role !== "member" && role !== "owner") return apiError("Pick admin, member or owner.", 400);
  try {
    return apiJson(await setMemberRole(id, me.id, userId, role));
  } catch (e) {
    if (e instanceof CrewError) return apiError(e.message, e.status);
    console.error("[api crews] role", id, e);
    return apiError("Couldn't change that. Try again in a sec.", 500);
  }
}

/** Remove someone from the crew. Owner removes anyone else; admins remove members. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const me = await apiOrganiser(req);
  if (!me) return apiError("Sign in again.", 401);
  const { id, userId } = await params;
  try {
    return apiJson(await removeFromCrew(id, me.id, userId));
  } catch (e) {
    if (e instanceof CrewError) return apiError(e.message, e.status);
    console.error("[api crews] remove", id, e);
    return apiError("Couldn't remove them. Try again in a sec.", 500);
  }
}
