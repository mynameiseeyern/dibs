"use client";

// The top of a plan page while it's voting or locked in (the app's components/dibby/selfie.tsx,
// same look): a group selfie. A violet camera screen with the crew squeezed in, tilted and bobbed
// like a real group shot, friendly "?" faces in the spots still free, and Dibby photobombing from
// the bottom right. A line under them fits the moment. When someone's joined since you last
// looked at this plan in this browser, the camera flashes. Works for any kind of plan.
// Reduce Motion: no pop or flash.

import { useEffect, useState } from "react";
import { monogram } from "@dibs/shared/plans";
import type { MonogramColour } from "@dibs/shared/types";
import * as Avatar from "@/components/ui/avatar";

type Person = { id: string; display_name: string; colour: MonogramColour };

/** How each face sits in the shot, left to right: a little up or down, a little tilted. */
const POSE = [
  { y: 10, r: -8 },
  { y: -8, r: 5 },
  { y: 4, r: -3 },
  { y: -12, r: 7 },
  { y: 8, r: -6 },
];
const MOST = 5;

function caption(going: number, capacity: number | null) {
  if (capacity !== null && going >= capacity) return "Full house!";
  if (going <= 1) return "Just one so far. Squeeze in!";
  return `${going} in. Squeeze in!`;
}

/** `crew`: who's in, you (or the host) first. `isYou`: the first face is you, so it says "You". */
export function SelfieBanner({ slug, crew, isYou, going, capacity }: { slug: string; crew: Person[]; isYou: boolean; going: number; capacity: number | null }) {
  const [flash, setFlash] = useState(false);

  // Spots in the shot: the crew, "+N" if there are more, then "?" up to the plan's limit.
  const room = Math.min(MOST, capacity ?? MOST);
  const people = crew.slice(0, crew.length > room ? room - 1 : room);
  const more = crew.length - people.length;
  type Face = { kind: "person"; p: Person; you: boolean } | { kind: "more"; n: number } | { kind: "free" };
  const faces: Face[] = people.map((p, i) => ({
    kind: "person",
    p,
    you: isYou && i === 0,
  }));
  if (more > 0) faces.push({ kind: "more", n: more });
  while (faces.length < Math.max(room, 3)) faces.push({ kind: "free" });
  // You (or the host) in the middle, the rest fanning out to either side.
  const order: Face[] = [];
  faces.forEach((f, i) => (i % 2 ? order.push(f) : order.unshift(f)));
  if (faces.length % 2 === 0) order.push(order.shift()!);

  useEffect(() => {
    const key = `dibs:selfie:${slug}`;
    try {
      const seen = localStorage.getItem(key);
      localStorage.setItem(key, String(going));
      if (seen !== null && Number(seen) < going && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setFlash(true);
    } catch {
      // No storage, no flash.
    }
  }, [slug, going]);

  const said = caption(going, capacity);
  return (
    <div className="selfie" role="img" aria-label={`Group selfie: ${going} ${going === 1 ? "person" : "people"} in. ${said}`}>
      <span className="selfie__corner selfie__corner--tl" />
      <span className="selfie__corner selfie__corner--tr" />
      <span className="selfie__corner selfie__corner--bl" />
      <span className="selfie__corner selfie__corner--br" />
      <div className="selfie__top">
        <span className="selfie__rec">
          <span className="selfie__dot" /> REC
        </span>
        <span className="selfie__count">{going} in</span>
      </div>
      <div className="selfie__faces">
        {order.map((f, i) => {
          const pose = POSE[i % POSE.length];
          return (
            <span
              key={i}
              className="selfie__spot"
              style={{
                transform: `translateY(${pose.y}px) rotate(${pose.r}deg)`,
              }}
            >
              <span className="selfie__pop" style={{ animationDelay: `${80 + i * 90}ms` }}>
                {f.kind === "free" ? (
                  <span className="selfie__free">?</span>
                ) : (
                  <Avatar.Root
                    className={f.kind === "person" && f.you ? "selfie__face selfie__face--you" : "selfie__face"}
                    size={f.kind === "person" && f.you ? "64" : "56"}
                    color={f.kind === "person" ? f.p.colour : "gray"}
                  >
                    {f.kind === "more" ? `+${f.n}` : f.you ? "You" : monogram(f.p.display_name)}
                  </Avatar.Root>
                )}
              </span>
            </span>
          );
        })}
      </div>
      <p className="selfie__caption">{said}</p>
      <img className="selfie__dibby" src="/dibby/stills/wave@480.png" alt="" width={150} height={150} draggable={false} />
      {flash ? <span className="selfie__flash" onAnimationEnd={() => setFlash(false)} /> : null}
    </div>
  );
}
