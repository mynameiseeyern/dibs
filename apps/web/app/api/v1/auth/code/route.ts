import { apiError, apiJson, EMAIL, readBody, sendCode, text } from "@/lib/api-auth";

/** `POST { email }`: emails a 6-digit sign-in code (a new email makes an account). */
export async function POST(req: Request) {
  const email = text((await readBody(req)).email, 200).toLowerCase();
  if (!EMAIL.test(email)) return apiError("That email doesn't look right.", 400);
  const { error } = await sendCode(email);
  return error ? apiError(error, 429) : apiJson({ sent: email });
}
