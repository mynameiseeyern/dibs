import { apiError, apiJson, apiOrganiser } from "@/lib/api-auth";
import { previewInvite } from "@/lib/crew-ops";

export const dynamic = "force-dynamic";

/** What an invite link shows. Works signed out (just the crew's name, emoji and size); signed in, also where you stand. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const me = await apiOrganiser(req);
  try {
    return apiJson(await previewInvite(token, me?.id ?? null));
  } catch (e) {
    console.error("[api crews] preview invite", e);
    return apiError("Couldn't open that invite. Try again in a sec.", 500);
  }
}
