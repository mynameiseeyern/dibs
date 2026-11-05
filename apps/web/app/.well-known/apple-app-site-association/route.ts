import { NextResponse } from "next/server";
import { appleAppSiteAssociation } from "@/lib/app-links";

export const dynamic = "force-dynamic";

/** iOS universal links. Apple fetches this with no extension and wants JSON back. */
export function GET() {
  return NextResponse.json(appleAppSiteAssociation(), { headers: { "Cache-Control": "public, max-age=3600" } });
}
