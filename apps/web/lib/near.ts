/** Rounded coordinates from a form (near_lat / near_lng), or null if missing or malformed. */
export function readNear(form: FormData): { lat: number; lng: number } | null {
  if (!form.get("near_lat") || !form.get("near_lng")) return null;
  const lat = Number(form.get("near_lat"));
  const lng = Number(form.get("near_lng"));
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
