"use client";

// The first time someone opens /new (the app's components/dibby/hello.tsx, for the web): nothing
// on screen but Dibby in the middle. He says hi a line at a time in a speech bubble over his head
// (his talking clip), then hops up to where he asks the first question and the form shows.
// Tap to hurry him along; Skip goes straight to the question.
//
// Only for people new here (PlanFlow decides: not signed in, no guest pass, nothing typed on the
// home page), and only once per browser (dibs:hello). It's drawn on the server, so the form never
// flashes first; if this browser has met him, or Reduce Motion is on, it just fades away.

import { useEffect, useRef, useState } from "react";
import { DibbyMotion } from "@/components/DibbyMotion";
import "./dibby-hello.css";

const KEY = "dibs:hello";
const SIZE = 176;
const LINES = [
  "Hi, I’m Dibby!",
  "I help your crew pick a day and a place.",
  "Then I make sure it actually happens. Let’s go!",
];
/** How long a line stays up: a relaxed pace per word, never under 1.4 seconds (as in the app). */
const lineFor = (s: string) =>
  Math.max(1400, s.split(/\s+/).length * 230 + 500);
const FLY_MS = 480;
const HIDE = `try{if(localStorage.getItem("${KEY}")==="1"||matchMedia("(prefers-reduced-motion: reduce)").matches)document.head.insertAdjacentHTML("beforeend","<style>.dh{display:none}</style>")}catch(e){}`;

export function DibbyHello({ onDone }: { onDone: () => void }) {
  const [line, setLine] = useState(-1);
  const [phase, setPhase] = useState<"on" | "leave" | "fade">("on");
  const figure = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const leaving = useRef(false);

  const end = (how: "leave" | "fade") => {
    if (leaving.current) return;
    leaving.current = true;
    clearTimeout(timer.current);
    // Up to where he asks the first question, at its size.
    const from = figure.current?.getBoundingClientRect();
    const to = document
      .querySelector(".pf .da-figure")
      ?.getBoundingClientRect();
    if (how === "leave" && from && to) {
      const el = figure.current!;
      el.style.setProperty(
        "--dh-dx",
        `${to.left + to.width / 2 - (from.left + from.width / 2)}px`,
      );
      el.style.setProperty(
        "--dh-dy",
        `${to.top + to.height / 2 - (from.top + from.height / 2)}px`,
      );
      el.style.setProperty("--dh-s", `${to.width / from.width}`);
    }
    setLine(-1);
    setPhase(how === "leave" && from && to ? "leave" : "fade");
    setTimeout(onDone, how === "leave" ? FLY_MS : 220);
  };

  const next = (from: number) => {
    if (leaving.current) return;
    clearTimeout(timer.current);
    const n = from + 1;
    if (n >= LINES.length) return end("leave");
    setLine(n);
    timer.current = setTimeout(() => next(n), lineFor(LINES[n]));
  };

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {
      // Private mode and the like: he says hi every time, which is fine.
    }
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return end("fade");
    const t = setTimeout(() => {
      // Marked as met once he starts talking (not on mount: React runs this twice in dev).
      try {
        localStorage.setItem(KEY, "1");
      } catch {}
      next(-1);
    }, 450);
    return () => {
      clearTimeout(t);
      clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Before the first paint: met him already (or Reduce Motion), so hide this straight away
          rather than flash him. A style in <head>, which hydration leaves alone. */}
      <script dangerouslySetInnerHTML={{ __html: HIDE }} />
      <div
        className="dh"
        data-phase={phase}
        role="dialog"
        aria-modal="true"
        aria-label="Dibby says hi"
      >
        <div className="dh-bg" />
        <button
          type="button"
          className="dh-tap"
          aria-label="Next"
          onClick={() => (line >= 0 ? next(line) : undefined)}
        />
        <div className="dh-col">
          <div className="dh-top">
            {line >= 0 ? (
              <div className="dh-bubble">
                <p
                  key={line}
                  className={line === 0 ? "dh-line dh-line--hi" : "dh-line"}
                  aria-live="polite"
                >
                  {LINES[line]}
                </p>
              </div>
            ) : null}
          </div>
          <div
            className="dh-figure"
            ref={figure}
            style={{ width: SIZE, height: SIZE }}
          >
            <DibbyMotion
              clip="talk-hi"
              loop
              px={SIZE}
              still="/dibby/stills/hi@480.png"
              srcSet="/dibby/stills/hi@480.png 480w, /dibby/stills/hi@720.png 720w"
              webp="/dibby/motion/talk-hi.webp"
              className="dh-clip"
              a11y={{ "aria-hidden": true }}
            />
          </div>
          <div className="dh-bottom">
            {line >= 0 ? (
              <p className="dh-hint label-sm">Tap to keep going</p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="dh-skip label-md"
          onClick={() => end("fade")}
        >
          Skip
        </button>
      </div>
    </>
  );
}
