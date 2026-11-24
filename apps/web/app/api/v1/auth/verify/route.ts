import { apiError, apiJson, EMAIL, readBody, text, verifyCode, verifyLink } from "@/lib/api-auth";

/** `POST { email, code }` or `POST { token_hash }` (the sign-in email's button) → `AuthSession`. */
export async function POST(req: Request) {
  const body = await readBody(req);
  const tokenHash = text(body.token_hash, 200);
  if (tokenHash) {
    if (!/^[\w-]{10,200}$/.test(tokenHash)) return apiError("That link doesn't look right.", 400);
    const result = await verifyLink(tokenHash);
    return "error" in result ? apiError(result.error, 401) : apiJson(result);
  }
  const email = text(body.email, 200).toLowerCase();
  const code = text(body.code, 12).replace(/\s/g, "");
  if (!EMAIL.test(email) || !/^\d{6,10}$/.test(code)) return apiError("That code doesn't look right.", 400);
  const result = await verifyCode(email, code);
  return "error" in result ? apiError(result.error, 401) : apiJson(result);
}
