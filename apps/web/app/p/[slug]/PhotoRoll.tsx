"use client";

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import type { MonogramColour } from "@dibs/shared/types";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

export type RollPhoto = { id: string; name: string; colour: MonogramColour; mine: boolean; stamp: string; width: number | null; height: number | null; glow: string | null };

/** Photos this browser has already watched develop, so the reveal plays once per photo. */
const SEEN_KEY = "dibs:developed";
function seen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function markSeen(id: string) {
  try {
    const all = seen();
    all.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...all].slice(-300)));
  } catch {}
}

/** The glow colours as CSS variables; without a glow, the person's crew colour and the brand's. */
function glowStyle(glow: string | null, colour: MonogramColour, i: number): CSSProperties {
  const c = glow?.split(",").map((h) => `#${h}`) ?? [`var(--crew-${colour})`, "var(--primary-base)", "var(--accent-base)", `var(--crew-${colour})`];
  return { "--g1": c[0], "--g2": c[1], "--g3": c[2], "--g4": c[3], "--i": i } as CSSProperties;
}

/** A developed photo. The first time this browser sees it, it develops in: pale and blurry, then sharp. */
function Print({ src, width, height, n }: { src: string; width: number | null; height: number | null; n: number }) {
  const img = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<"wait" | "develop" | "done">("wait");
  const loaded = () => {
    if (phase !== "wait") return;
    const id = src.split("/").at(-1)!;
    const fresh = !seen().has(id);
    setPhase(fresh ? "develop" : "done");
    if (fresh) markSeen(id);
  };
  // Already in the cache before React was listening.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth) loaded();
  });
  return (
    // eslint-disable-next-line @next/next/no-img-element -- private, access-checked route; not for next/image
    <img ref={img} src={src} alt="" loading="lazy" width={width ?? undefined} height={height ?? undefined} data-phase={phase} onLoad={loaded} className="roll__img" style={{ "--n": n } as CSSProperties} />
  );
}

/**
 * Everyone's shots. Developing: a little stack of clay polaroids per person, swirling with a blur of each
 * shot's colours (worked out on the phone), nothing you could make out. Developed (at wrap-up): the
 * photos, each with its date stamp, developing in the first time you see them; tap for the full
 * one, save it, or take back your own.
 */
export function PhotoRoll({ slug, photos, revealed, remove }: { slug: string; photos: RollPhoto[]; revealed: boolean; remove: (id: string) => Promise<{ error?: string }> }) {
  const [open, setOpen] = useState<RollPhoto | null>(null);
  const [pending, start] = useTransition();
  if (photos.length === 0) return null;

  if (!revealed) {
    const people = [...new Map(photos.map((p) => [p.name, { name: p.name, colour: p.colour, shots: photos.filter((x) => x.name === p.name) }])).values()];
    return (
      <ul className="roll" aria-label="Photos developing">
        {people.map((p) => (
          <li key={p.name} className="dev" aria-label={`${p.name}: ${p.shots.length} ${p.shots.length === 1 ? "shot" : "shots"}, developing`}>
            {/* The person's shots as a little stack of prints, each glowing with its own colours. */}
            {p.shots
              .slice(0, 3)
              .reverse()
              .map((s, i, all) => (
                <span key={s.id} className={i === all.length - 1 ? "dev__print dev__print--top" : "dev__print"} style={glowStyle(s.glow, p.colour, all.length - 1 - i)} aria-hidden="true">
                  <span className="dev__window">
                    <span className="dev__bath" />
                    <span className="dev__grain" />
                    {i === all.length - 1 && (
                      <span className="dev__label">
                        <i className="ri-film-line db-icon" />
                        Developing
                      </span>
                    )}
                  </span>
                  {i === all.length - 1 && (
                    <span className="dev__chin">
                      <span className="dev__name">{p.name}</span>
                      <span className="dev__count">
                        {Array.from({ length: 3 }, (_, d) => (
                          <span key={d} className={d < p.shots.length ? "dev__dot dev__dot--on" : "dev__dot"} />
                        ))}
                      </span>
                    </span>
                  )}
                </span>
              ))}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <ul className="roll" aria-label="Photos">
        {photos.map((p, n) => (
          <li key={p.id} className="roll__tile">
            <button type="button" className="roll__open" onClick={() => setOpen(p)} aria-label={`Photo by ${p.name}, ${p.stamp}`}>
              <Print src={`/p/${slug}/photos/${p.id}`} width={p.width} height={p.height} n={n} />
              <span className="roll__stamp" aria-hidden="true">{p.stamp}</span>
              <span className="roll__name">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <Modal.Root open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <Modal.Content className="max-h-[92dvh] overflow-y-auto">
          {open && (
            <>
              <Modal.Header title={open.name} description={open.stamp} />
              <div className="roll__full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/p/${slug}/photos/${open.id}`} alt={`Photo by ${open.name}`} />
                <span className="roll__stamp" aria-hidden="true">{open.stamp}</span>
              </div>
              <Modal.Footer>
                <Button.Root asChild size="large" block>
                  <a href={`/p/${slug}/photos/${open.id}?download=1`} download>
                    <i className="ri-download-2-line db-icon" aria-hidden="true" />
                    Save photo
                  </a>
                </Button.Root>
                {open.mine && (
                  <Button.Root
                    type="button"
                    variant="error"
                    mode="ghost"
                    size="large"
                    block
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await remove(open.id);
                        if (res.error) return void toast.error(res.error);
                        setOpen(null);
                        toast.success("Photo taken down");
                      })
                    }
                  >
                    {pending ? "Taking it down…" : "Take my photo down"}
                  </Button.Root>
                )}
              </Modal.Footer>
            </>
          )}
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
