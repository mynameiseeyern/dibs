"use client";

import { useState, useTransition } from "react";
import type { MonogramColour } from "@dibs/shared/types";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

export type RollPhoto = { id: string; name: string; colour: MonogramColour; mine: boolean; stamp: string; width: number | null; height: number | null };

/**
 * Everyone's shots. Developing: one dark card per person who's taken some, nothing to see yet.
 * Developed (at wrap-up): the photos, each with its date stamp; tap for the full one, save it,
 * or take back your own.
 */
export function PhotoRoll({ slug, photos, revealed, remove }: { slug: string; photos: RollPhoto[]; revealed: boolean; remove: (id: string) => Promise<{ error?: string }> }) {
  const [open, setOpen] = useState<RollPhoto | null>(null);
  const [pending, start] = useTransition();
  if (photos.length === 0) return null;

  if (!revealed) {
    const people = [...new Map(photos.map((p) => [p.name, { name: p.name, n: photos.filter((x) => x.name === p.name).length }])).values()];
    return (
      <ul className="roll" aria-label="Photos developing">
        {people.map((p) => (
          <li key={p.name} className="roll__tile roll__tile--developing">
            <span className="roll__developing">
              <i className="ri-film-line db-icon" aria-hidden="true" />
              Developing
            </span>
            <span className="roll__name">
              {p.name} · {p.n} {p.n === 1 ? "shot" : "shots"}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <ul className="roll" aria-label="Photos">
        {photos.map((p) => (
          <li key={p.id} className="roll__tile">
            <button type="button" className="roll__open" onClick={() => setOpen(p)} aria-label={`Photo by ${p.name}, ${p.stamp}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- private, access-checked route; not for next/image */}
              <img src={`/p/${slug}/photos/${p.id}`} alt="" loading="lazy" width={p.width ?? undefined} height={p.height ?? undefined} />
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
