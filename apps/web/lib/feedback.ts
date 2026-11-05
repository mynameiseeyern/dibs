"use client";

// ARV-51: haptics on the big moments, and sounds.
// Haptics use the Vibration API, which Android browsers have and iPhone browsers don't,
// so on iPhone they do nothing until the native app (ARV-47). Both respect reduced motion.
//
// Sounds are synthesised from recipes (lib/sounds), no audio files. One switch for the whole
// app, per device, on /account and next to the wheel. They only ever play off a tap (or once
// the page has had one), stay quiet, and follow the iPhone's silent switch where Safari lets us.

import { playPatch } from "./sounds/player";
import { SOUNDS, type SoundName } from "./sounds/recipes";

export { HAPTICS } from "./haptics";
export type { SoundName } from "./sounds/recipes";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function buzz(pattern: readonly number[]) {
  if (reduced()) return;
  try {
    navigator.vibrate?.([...pattern]);
  } catch {}
}

// ---------- The sound switch ----------

const SOUND_KEY = "dibs:sound";
/** The wheel's old switch. If someone turned it on there, that carries over. */
const OLD_ROULETTE_KEY = "dibby:roulette-sound";
/** On for anyone who hasn't chosen. Flip this to make sounds opt-in. */
const DEFAULT_ON = true;
/** Everything plays through this, under the recipes' own levels. */
const MASTER = 0.8;

const listeners = new Set<(on: boolean) => void>();

export function soundOn(): boolean {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    if (v) return v === "on";
    if (localStorage.getItem(OLD_ROULETTE_KEY) === "on") return true;
  } catch {}
  return DEFAULT_ON;
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {}
  for (const l of listeners) l(on);
  // Unlock audio inside the tap that turned it on, and say so with a sound.
  if (on) play("toggleOn");
}

/** For the switches: hear when it's changed somewhere else on the page. */
export function onSoundChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- Audio ----------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let tapped = false;

function audio(): { c: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    // Safari 17+: "ambient" mixes with their music and goes quiet on the silent switch.
    try {
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = "ambient";
    } catch {}
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);
  }
  return { c: ctx, out: master! };
}

// Browsers only start audio inside a tap. Note the first one, so sounds that aren't from a tap
// (someone else's message arriving) wait until the page has had one rather than fail silently.
if (typeof window !== "undefined") {
  const unlock = () => {
    tapped = true;
    if (soundOn()) void audio()?.c.resume();
  };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  window.addEventListener("keydown", unlock, { once: true, capture: true });
}

const lastPlayed = new Map<SoundName, number>();

/**
 * Plays one of Dibby's sounds, if sound is on. Safe to call from anywhere on the client.
 * `within`: skip it if the same sound played this recently (ms), for a moment that two
 * places can both mark, like the tap that pays and the celebration that follows.
 */
export function play(name: SoundName, { within = 80 }: { within?: number } = {}) {
  if (!soundOn() || !tapped) return;
  if (typeof document !== "undefined" && document.hidden) return;
  // The same sound twice in a blink is one sound (a double fire, or a burst of messages).
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -1e9) < within) return;
  lastPlayed.set(name, now);
  const a = audio();
  if (!a) return;
  const go = () => {
    try {
      playPatch(a.c, SOUNDS[name], a.out);
    } catch {}
  };
  if (a.c.state === "running") go();
  else void a.c.resume().then(go, () => {});
}

// ---------- The wheel: synthesised ticks that follow its spin ----------

function blip(c: AudioContext, out: AudioNode, at: number, freq: number, dur: number, vol: number, type: OscillatorType = "triangle") {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.02);
  return o;
}

/**
 * Ticks that slow down over the spin (like a wheel passing pegs), then a little two-note
 * reveal. Returns a stop function. Does nothing if sound is off or audio isn't available.
 */
export function playRouletteSpin(spinMs: number): () => void {
  if (!soundOn() || reduced()) return () => {};
  const a = audio();
  if (!a) return () => {};
  const { c, out } = a;
  void c.resume();
  const start = c.currentTime + 0.02;
  const total = spinMs / 1000;
  const queued: OscillatorNode[] = [];
  // Ease-out: ticks bunch up at the start and spread out as it slows.
  const ticks = 34;
  for (let i = 0; i < ticks; i++) {
    const p = i / ticks;
    const t = total * (1 - Math.pow(1 - p, 2.2)) * 0.98;
    queued.push(blip(c, out, start + t, 1500 - p * 500, 0.035, 0.12, "square"));
  }
  // Reveal: up a fifth.
  queued.push(blip(c, out, start + total + 0.12, 660, 0.25, 0.18));
  queued.push(blip(c, out, start + total + 0.26, 990, 0.45, 0.18));
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    // Cut only the wheel's own ticks, so other sounds keep playing.
    for (const o of queued) {
      try {
        o.stop();
      } catch {}
    }
  };
}
