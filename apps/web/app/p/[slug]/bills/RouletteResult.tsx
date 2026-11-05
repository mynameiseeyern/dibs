"use client";

import { useCallback, useEffect, useState } from "react";
import { Wheel, type WheelMode } from "./Wheel";
import * as Button from "@/components/ui/button";
import { buzz, HAPTICS, soundOn, setSoundOn } from "@/lib/feedback";

const seenKey = (billId: string) => `dibs:spin-seen:${billId}`;

/**
 * A spun roulette bill, for everyone on the bills page. The first time a phone sees the
 * result (open when it happened, or opened later) it plays the spin; after that it sits
 * on the loser. "Watch it again" replays it.
 */
export function RouletteResult({
  billId,
  title,
  names,
  loserIndex,
  loserName,
  amount,
  big,
}: {
  billId: string;
  title: string;
  names: string[];
  loserIndex: number;
  loserName: string;
  amount: string;
  big: boolean;
}) {
  const [mode, setMode] = useState<WheelMode>("suspense");

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(seenKey(billId)) === "1";
    } catch {
      // No storage (private mode): play it, it's only a few seconds.
    }
    if (seen) {
      setMode("landed");
      return;
    }
    const t = setTimeout(() => setMode("spin"), 500);
    return () => clearTimeout(t);
  }, [billId]);

  const [sound, setSound] = useState(false);
  useEffect(() => setSound(soundOn()), []);
  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };

  const landed = useCallback(() => {
    setMode("landed");
    buzz(HAPTICS.roulette);
    try {
      localStorage.setItem(seenKey(billId), "1");
    } catch {}
  }, [billId]);

  const replay = () => {
    setMode("suspense");
    setTimeout(() => setMode("spin"), 300);
  };

  return (
    <section className={big ? "moment" : "db-card section roulette-done"} aria-label={`Spin the wheel for ${title}`}>
      <span className="subheading-sm eyebrow">Spin the wheel · {title}</span>
      <Wheel names={names} loserIndex={loserIndex} mode={mode} onLanded={landed} />
      <div className="roulette-done__result" aria-live="polite">
        {mode === "landed" ? (
          <>
            <h2 className={big ? "title-h2" : "title-h4"}>{loserName}&rsquo;s shout.</h2>
            <p className="muted">
              {loserName} covers <span className="money">{amount}</span>. Everyone else is square on this one.
            </p>
            <div className="db-row justify-center">
              <Button.Root type="button" mode="ghost" size="small" onClick={replay}>
                <i className="ri-replay-line db-icon" aria-hidden="true" />
                Watch it again
              </Button.Root>
              <Button.Root type="button" mode="ghost" size="small" onClick={toggleSound} aria-pressed={sound}>
                <i className={`${sound ? "ri-volume-up-line" : "ri-volume-mute-line"} db-icon`} aria-hidden="true" />
                {sound ? "Sound on" : "Sound off"}
              </Button.Root>
            </div>
          </>
        ) : (
          <p className="paragraph-sm muted typing">
            Spinning
            <span className="dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
