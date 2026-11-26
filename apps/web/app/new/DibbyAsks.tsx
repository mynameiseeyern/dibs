"use client";

// Making a plan, Dibby asks (the app's components/dibby/hero.tsx, for the web): he stands centred
// at the top with the question in a speech bubble under him, the screen's heading. On to the next
// question he jumps on the spot (crouch, up, land, settle, all CSS), lands in the next pose, the
// bubble swaps its words while he's in the air, and once he's landed he says it: his talking clip
// plays for about as long as the words take, then he's back to his still, breathing.
//
// The talking clip (public/dibby/motion/talk-<pose>.mp4, via DibbyMotion) is mounted the moment
// the question changes, hidden, so it buffers during the jump; it shows only while he talks. The
// stills underneath are the same framing, so nothing jumps either side. Reduce Motion: no jump,
// breathing or talking, the words just change.

import { useEffect, useRef, useState } from "react";
import { DibbyMotion } from "@/components/DibbyMotion";

export type Pose = "think" | "phone" | "point" | "look" | "hi";
const POSES: Pose[] = ["think", "phone", "point", "look", "hi"];

/** The jump, in ms: crouch 110, air 360, land and settle 310 (matches dibby-asks.css). */
const APEX_MS = 290;
const LAND_MS = 470;
/** How long he talks: a relaxed pace per word, never under two seconds (as in the app). */
const talkFor = (q: string) => Math.max(2000, q.trim().split(/\s+/).length * 280 + 500);

const still = (p: Pose) => `/dibby/stills/${p}@480.png`;
const stillSet = (p: Pose) => `/dibby/stills/${p}@480.png 480w, /dibby/stills/${p}@720.png 720w`;

export function DibbyAsks({ pose, question, size = 112, id }: { pose: Pose; question: string; size?: number; id?: string }) {
  const [shown, setShown] = useState(pose);
  const [said, setSaid] = useState(question);
  const [box, setBox] = useState(size);
  const [talking, setTalking] = useState(false);
  /** The clip that's mounted: from the moment the question changes until he's said it. */
  const [clip, setClip] = useState<Pose | null>(null);
  /** Bumped on every jump, so the CSS animation runs again. */
  const [jump, setJump] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const speak = (at: number) => {
      if (reduce) return;
      setClip(pose);
      timers.push(
        setTimeout(() => setTalking(true), at),
        setTimeout(() => {
          setTalking(false);
          setClip(null);
        }, at + talkFor(question))
      );
    };
    setTalking(false);
    if (first.current || reduce) {
      first.current = false;
      setShown(pose);
      setSaid(question);
      setBox(size);
      speak(400);
      return () => timers.forEach(clearTimeout);
    }
    setJump((j) => j + 1);
    timers.push(
      setTimeout(() => {
        setShown(pose);
        setSaid(question);
        setBox(size);
      }, APEX_MS)
    );
    speak(LAND_MS + 80);
    return () => timers.forEach(clearTimeout);
  }, [pose, question, size]);

  return (
    <div className="da">
      <div className="da-figure" style={{ width: box, height: box }}>
        <span className="da-shadow" key={`s${jump}`} data-jump={jump > 0 || undefined} aria-hidden="true" />
        <div className="da-breathe">
          <div className="da-body" key={`b${jump}`} data-jump={jump > 0 || undefined}>
            {/* Every pose loaded, one showing: switching is instant. */}
            {POSES.map((p) => (
              <img
                key={p}
                className="da-still"
                src={still(p)}
                srcSet={stillSet(p)}
                sizes={`${box}px`}
                width={box}
                height={box}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{ opacity: p === shown && !talking ? 1 : 0 }}
              />
            ))}
            {/* His talking clip for this question: buffering from the moment it changed, shown while he talks. */}
            {clip ? (
              <span className="da-talk" key={`t-${clip}`} style={{ opacity: talking && shown === clip ? 1 : 0 }}>
                <DibbyMotion
                  clip={`talk-${clip}`}
                  loop
                  px={box}
                  still={still(clip)}
                  srcSet={stillSet(clip)}
                  webp={`/dibby/motion/talk-${clip}.webp`}
                  className="da-clip"
                  a11y={{ "aria-hidden": true }}
                />
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="da-bubble" key={`w${jump}`} data-jump={jump > 0 || undefined}>
        <h1 id={id} className="da-q" aria-live="polite">
          {said}
        </h1>
      </div>
    </div>
  );
}
