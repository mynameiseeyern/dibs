import { ImageResponse } from "next/og";
import { OgMark } from "@/lib/og";

// iOS home screen and iMessage's small link icon. iOS rounds the corners itself, so the tile is square.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<OgMark size={180} rounded={false} />, size);
}
