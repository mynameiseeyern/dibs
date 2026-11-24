import { NextResponse, type NextRequest } from "next/server";

// The button in a sign-in email the app asked for. With the app installed, iOS and Android open
// it there (lib/app-links.ts). Opened in a browser instead (no app, or the email read on a
// laptop), it signs in on the web like any other sign-in link.
export function GET(req: NextRequest) {
  const url = new URL("/auth/callback", req.url);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));
  return NextResponse.redirect(url);
}
