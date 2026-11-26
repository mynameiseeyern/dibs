import { apiJson } from "@/lib/api-auth";
import { placesPass } from "@/lib/places-pass";

export const dynamic = "force-dynamic";

/**
 * `GET /api/v1/places/pass` → `{ pass }`: lets someone making their first plan in the app (no
 * account, no guest pass yet) search places, the same short-lived pass the web's /new page hands out.
 */
export function GET() {
  return apiJson({ pass: placesPass() });
}
