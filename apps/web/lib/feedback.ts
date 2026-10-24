"use client";

// ARV-51: haptics on the big moments and a roulette sound you can turn on.
// Haptics use the Vibration API, which Android browsers have and iPhone browsers don't,
// so on iPhone this does nothing until the native app (ARV-47). Both respect reduced motion.

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export { HAPTICS } from "./haptics";

export function buzz(pattern: readonly number[]) {
  if (reduced()) return;
  try {
    navigator.vibrate?.([...pattern]);
  } catch {}
}

// ---------- Roulette sound: synthesised, no audio files ----------

const SOUND_KEY = "dibby:roulette-sound";

/** Off unless they turned it on on this device. */
export function rouletteSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}
export function setRouletteSound(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {}
  // Unlock audio inside the tap that turned it on, so the next spin can play.
  if (on) void audio()?.resume();
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

function blip(c: AudioContext, at: number, freq: number, dur: number, vol: number, type: OscillatorType = "triangle") {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/**
 * Ticks that slow down over the spin (like a wheel passing pegs), then a little two-note
 * reveal. Returns a stop function. Does nothing if sound is off or audio isn't available.
 */
export function playRouletteSpin(spinMs: number): () => void {
  if (!rouletteSoundOn() || reduced()) return () => {};
  const c = audio();
  if (!c) return () => {};
  void c.resume();
  const start = c.currentTime + 0.02;
  const total = spinMs / 1000;
  // Ease-out: ticks bunch up at the start and spread out as it slows.
  const ticks = 34;
  for (let i = 0; i < ticks; i++) {
    const p = i / ticks;
    const t = total * (1 - Math.pow(1 - p, 2.2)) * 0.98;
    blip(c, start + t, 1500 - p * 500, 0.035, 0.12, "square");
  }
  // Reveal: up a fifth.
  blip(c, start + total + 0.12, 660, 0.25, 0.18);
  blip(c, start + total + 0.26, 990, 0.45, 0.18);
  const node = c;
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    // Cut anything still queued by suspending; the next spin resumes it.
    void node.suspend();
  };
}
