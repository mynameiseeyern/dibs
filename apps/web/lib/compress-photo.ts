"use client";

/** Long edge of a saved photo. Sharp on a phone screen, a few hundred KB as JPEG. */
const MAX_EDGE = 1600;
/** Quality steps: try the first; if it's still big (a busy scene), step down. */
const QUALITIES = [0.8, 0.7, 0.6];
const TARGET_BYTES = 700 * 1024;

/**
 * Shrinks and re-encodes a photo on the phone before it's sent: at most 1600px on the long edge,
 * JPEG at 80% (lower if it's still big). Drawing it onto a canvas keeps only the pixels, so the
 * GPS, camera and other details in the original never leave the phone. Turned the right way up.
 */
export async function compressPhoto(file: File): Promise<{ blob: Blob; width: number; height: number; glow: string | null }> {
  const source = await decode(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(source.image, 0, 0, width, height);
  source.close?.();
  let blob: Blob | null = null;
  for (const q of QUALITIES) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= TARGET_BYTES) break;
  }
  if (!blob) throw new Error("Couldn't encode");
  return { blob, width, height, glow: glowOf(canvas) };
}

/**
 * Four colours, one per corner, for the developing tile to glow with: the photo squashed to 2×2
 * pixels, nudged a little brighter and more saturated. A smudge of colour, nothing you could make out.
 */
function glowOf(canvas: HTMLCanvasElement): string | null {
  try {
    const tiny = document.createElement("canvas");
    tiny.width = 2;
    tiny.height = 2;
    const ctx = tiny.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, 2, 2);
    const d = ctx.getImageData(0, 0, 2, 2).data;
    const out: string[] = [];
    for (let i = 0; i < 16; i += 4) {
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
      const grey = (r + g + b) / 3;
      const pop = (c: number) => Math.max(0, Math.min(255, Math.round(grey + (c - grey) * 1.5 + 18)));
      out.push([pop(r), pop(g), pop(b)].map((c) => c.toString(16).padStart(2, "0")).join(""));
    }
    return out.join(",");
  } catch {
    return null;
  }
}

/** Decodes with the photo's own rotation applied. Falls back to an <img> where createImageBitmap can't. */
async function decode(file: File): Promise<{ image: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {}
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { image: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
