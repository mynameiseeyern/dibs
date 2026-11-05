"use client";

import { useEffect, useState } from "react";
import * as Hint from "@/components/ui/hint";
import * as Switch from "@/components/ui/switch";
import { onSoundChange, setSoundOn, soundOn } from "@/lib/feedback";

/** Sounds on or off, for this browser. Same switch as the one by the wheel. */
export function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(soundOn());
    return onSoundChange(setOn);
  }, []);

  return (
    <div className="db-stack">
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <Switch.Root checked={on} onCheckedChange={(v) => setSoundOn(v)} aria-describedby="sound-hint" />
        Sounds
      </label>
      <Hint.Root id="sound-hint">
        {on ? "Little sounds when you vote, chat, lock a plan in or spin the wheel. Your phone's silent switch still wins on iPhone." : "Off on this browser."}
      </Hint.Root>
    </div>
  );
}
