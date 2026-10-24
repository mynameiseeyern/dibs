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
export async function compressPhoto(file: File): Promise<{ blob: Blob; width: number; height: number }> {
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
  return { blob, width, height };
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
