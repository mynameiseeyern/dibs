import { NextResponse, type NextRequest } from "next/server";
import { BETA_LIST } from "@dibs/email";
import { store } from "@/lib/store";

/**
 * One-click unsubscribe (RFC 8058). Gmail and Apple Mail show their own Unsubscribe button
 * when an email has List-Unsubscribe headers, and post here when it's tapped.
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });
  const sub = await store.unsubscribe(BETA_LIST, { token });
  return NextResponse.json({ ok: Boolean(sub) }, { status: sub ? 200 : 404 });
}

/** Someone opened the link in a browser: show the page with the button instead. */
export function GET(req: NextRequest) {
  const url = new URL("/unsubscribe", req.nextUrl.origin);
  const token = req.nextUrl.searchParams.get("t");
  if (token) url.searchParams.set("t", token);
  return NextResponse.redirect(url, 303);
}
