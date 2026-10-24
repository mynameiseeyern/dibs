"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { compressPhoto } from "@/lib/compress-photo";

/**
 * The Dibby camera: three shots each, like a disposable. Pick or take a photo; it's shrunk on the
 * phone, sent, and stays developing until the host wraps up.
 */
export function CameraCard({ slug, taken, max, revealed }: { slug: string; taken: number; max: number; revealed: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const left = Math.max(0, max - taken);

  async function send(file: File) {
    setBusy(true);
    try {
      let photo;
      try {
        photo = await compressPhoto(file);
      } catch {
        return void toast.error("Couldn't read that photo", { description: "Try another, or take one with the camera." });
      }
      const form = new FormData();
      form.set("photo", photo.blob, "photo.jpg");
      form.set("width", String(photo.width));
      form.set("height", String(photo.height));
      if (photo.glow) form.set("glow", photo.glow);
      const res = await fetch(`/p/${slug}/photos`, { method: "POST", body: form }).catch(() => null);
      const body = (await res?.json().catch(() => null)) as { left?: number; error?: string } | null;
      if (!res?.ok) return void toast.error(body?.error ?? "Couldn't send that one", { description: res ? undefined : "Looks like you're offline." });
      toast.success(revealed ? "Added to the photos" : "Shot taken", {
        description: revealed ? undefined : `It develops when the host wraps up.${body?.left ? ` ${body.left} left.` : ""}`,
      });
      router.refresh();
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section className="db-card camera" aria-labelledby="camera-h">
      <div className="camera__head">
        <span className="camera__icon" aria-hidden="true">
          <i className="ri-camera-3-line db-icon" />
        </span>
        <div className="camera__text">
          <h2 id="camera-h" className="label-md">Dibby camera</h2>
          <p className="paragraph-sm muted">
            {left === 0 ? "That's your three." : `${left} of ${max} shots left`}
            {revealed ? "" : " · develops at wrap-up"}
          </p>
        </div>
        <span className="camera__shots" aria-hidden="true">
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className="camera__shot" data-used={i < taken || undefined} />
          ))}
        </span>
      </div>
      {left > 0 && (
        <>
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
          <Button.Root type="button" variant="neutral" mode="lighter" block disabled={busy} onClick={() => input.current?.click()}>
            <i className={`${busy ? "ri-loader-4-line db-spin" : "ri-camera-line"} db-icon`} aria-hidden="true" />
            {busy ? "Sending…" : "Take a photo"}
          </Button.Root>
        </>
      )}
    </section>
  );
}
