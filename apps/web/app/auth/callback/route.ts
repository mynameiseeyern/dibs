import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuth } from "@/lib/auth";

// Magic-link landing: swap the code for a session, then carry on.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/home";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/home";
  if (code) {
    const { error } = await (await supabaseAuth()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, req.url));
  }
  return NextResponse.redirect(new URL("/login?error=link", req.url));
}
