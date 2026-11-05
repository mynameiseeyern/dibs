import { apiError, apiJson, EMAIL, readBody, text, verifyCode } from "@/lib/api-auth";

/** `POST { email, code }` → `AuthSession`. */
export async function POST(req: Request) {
  const body = await readBody(req);
  const email = text(body.email, 200).toLowerCase();
  const code = text(body.code, 12).replace(/\s/g, "");
  if (!EMAIL.test(email) || !/^\d{6,10}$/.test(code)) return apiError("That code doesn't look right.", 400);
  const result = await verifyCode(email, code);
  return "error" in result ? apiError(result.error, 401) : apiJson(result);
}
