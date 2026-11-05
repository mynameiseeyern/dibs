import { apiError, apiJson, readBody, refreshSession, text } from "@/lib/api-auth";

/** `POST { refresh_token }` → a fresh `AuthSession`. A 401 means sign in again. */
export async function POST(req: Request) {
  const token = text((await readBody(req)).refresh_token, 500);
  if (!token) return apiError("Sign in again.", 401);
  const result = await refreshSession(token);
  return "error" in result ? apiError(result.error, 401) : apiJson(result);
}
