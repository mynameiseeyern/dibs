import { NextResponse } from "next/server";
import { assetLinks } from "@/lib/app-links";

export const dynamic = "force-dynamic";

/** Android App Links: lets the app open dibby.social/p/… links without a chooser. */
export function GET() {
  return NextResponse.json(assetLinks(), { headers: { "Cache-Control": "public, max-age=3600" } });
}
