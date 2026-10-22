import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseAuth } from "@/lib/auth";

// Magic-link landing. Two kinds of link arrive here:
// - token_hash (our email template): works in any browser, including Gmail's and Mail's
//   in-app browsers, because it doesn't depend on a cookie from the tab that asked.
// - code (Supabase's default PKCE link): only works in the same browser that asked.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const nextParam = params.get("next") ?? "/home";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/home";
  const supabase = await supabaseAuth();

  const tokenHash = params.get("token_hash");
  const type = (params.get("type") ?? "email") as EmailOtpType;
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, req.url));
    console.error("[auth callback] verifyOtp", error.status, error.code, error.message);
    const why = /expired|invalid/i.test(error.message) ? "expired" : "link";
    return NextResponse.redirect(new URL(`/login?error=${why}&next=${encodeURIComponent(next)}`, req.url));
  }

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, req.url));
    console.error("[auth callback] exchangeCode", error.status, error.code, error.message);
    return NextResponse.redirect(new URL(`/login?error=browser&next=${encodeURIComponent(next)}`, req.url));
  }

  return NextResponse.redirect(new URL(`/login?error=link&next=${encodeURIComponent(next)}`, req.url));
}
