/**
 * The recipe player: turns one recipe (`recipes.ts`) into Web Audio nodes and plays it.
 *
 * A typed port of the standalone player from procedural-sounds
 * (https://github.com/m1ckc3s/procedural-sounds, `lib/audio/export/snippet.ts`).
 * MIT License, Copyright (c) 2026 Mick Cesanek. The synth core there began as an adaptation of
 * raphaelsalaja/audio (MIT, Copyright (c) 2026 Raphael Salaja).
 *
 * Changes from upstream: types; plays through a `destination` node (Dibby's master volume)
 * instead of straight to the speakers; noise buffers and reverb impulses are cached; every
 * node is disconnected once its sound has rung out.
 */

type Freq = number | { start: number; end: number; time?: number };

export type Layer = {
  source:
    | { type: "noise"; color?: "white" | "pink" | "brown" }
    | { type: OscillatorType; frequency: Freq; detune?: number; fm?: { ratio: number; depth: number } };
  envelope?: { attack?: number; decay: number; sustain?: number; release?: number; curve?: "ramp" };
  gain?: number;
  delay?: number;
  filter?: Filter | Filter[];
  effects?: Effect[];
};
type Filter = { type: BiquadFilterType; frequency: number; Q?: number; resonance?: number; envelope?: { attack?: number; peak: number; decay: number } };
type Effect =
  | { type: "reverb"; decay?: number; mix?: number; damping?: number; roomSize?: number; preDelay?: number }
  | { type: "delay"; delay: number; feedback: number; wet: number; lowpass?: number };

export type Patch = Layer | { layers: Layer[] };

const FLOOR = 0.0001;

const noiseCache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
function noiseBuffer(ctx: BaseAudioContext, seconds: number, color?: string): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const key = `${color ?? "white"}:${len}`;
  let byKey = noiseCache.get(ctx);
  if (!byKey) noiseCache.set(ctx, (byKey = new Map()));
  const hit = byKey.get(key);
  if (hit) return hit;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (color === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else if (color === "brown") {
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
  } else {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  byKey.set(key, buf);
  return buf;
}

type Built = { input: AudioNode; output: AudioNode; nodes: AudioNode[]; tail: number };

function reverb(ctx: BaseAudioContext, o: Extract<Effect, { type: "reverb" }>): Built {
  const decay = o.decay ?? 0.5;
  const mix = o.mix ?? 0.3;
  const damping = o.damping ?? 0;
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  dry.gain.value = 1 - mix;
  input.connect(dry).connect(output);
  const wet = ctx.createGain();
  wet.gain.value = mix;
  input.connect(wet);
  const len = Math.max(1, Math.ceil(ctx.sampleRate * decay * (o.roomSize ?? 1)));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28));
    if (damping > 0) {
      const c = Math.min(damping, 0.99);
      let prev = 0;
      for (let i = 0; i < len; i++) {
        prev = d[i] * (1 - c) + prev * c;
        d[i] = prev;
      }
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  const nodes: AudioNode[] = [input, output, dry, wet, conv];
  const pre = o.preDelay ?? 0;
  if (pre > 0) {
    const pd = ctx.createDelay(Math.max(pre + 0.01, 1));
    pd.delayTime.value = pre;
    wet.connect(pd).connect(conv);
    nodes.push(pd);
  } else {
    wet.connect(conv);
  }
  conv.connect(output);
  return { input, output, nodes, tail: pre + len / ctx.sampleRate };
}

function shimmer(ctx: BaseAudioContext, o: Extract<Effect, { type: "delay" }>): Built {
  const input = ctx.createGain();
  const output = ctx.createGain();
  input.connect(output);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = o.delay;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = o.lowpass ?? 4000;
  const fb = ctx.createGain();
  fb.gain.value = o.feedback;
  const wet = ctx.createGain();
  wet.gain.value = o.wet;
  input.connect(delay);
  delay.connect(lp).connect(fb).connect(delay);
  lp.connect(wet).connect(output);
  // Echoes die away by ~60dB after this many repeats.
  const repeats = o.feedback > 0 ? Math.min(40, Math.ceil(Math.log(0.001) / Math.log(o.feedback))) : 1;
  return { input, output, nodes: [input, output, delay, lp, fb, wet], tail: o.delay * repeats };
}

/** Plays `patch` into `destination`, starting now. Returns when it will have finished, in seconds from now. */
export function playPatch(ctx: BaseAudioContext, patch: Patch, destination: AudioNode): number {
  const t0 = ctx.currentTime;
  let longest = 0;
  for (const layer of "layers" in patch ? patch.layers : [patch]) {
    const t = t0 + (layer.delay ?? 0);
    const gain = layer.gain ?? 0.5;
    const env = layer.envelope;
    const a = env?.attack ?? 0;
    const d = env?.decay ?? 0;
    const sus = env?.sustain ?? 0;
    const rel = env?.release ?? 0;
    const dur = env ? a + d + rel : 0.5;
    const nodes: AudioNode[] = [];

    const g = ctx.createGain();
    nodes.push(g);
    if (!env) {
      g.gain.setValueAtTime(gain, t);
      g.gain.setTargetAtTime(FLOOR, t, 0.15);
    } else if (env.curve === "ramp") {
      const peak = Math.max(gain, FLOOR);
      g.gain.setValueAtTime(FLOOR, t);
      if (a > 0) g.gain.exponentialRampToValueAtTime(peak, t + a);
      else g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(FLOOR, t + a + d);
    } else {
      g.gain.setValueAtTime(FLOOR, t);
      if (a > 0) g.gain.linearRampToValueAtTime(gain, t + a);
      else g.gain.setValueAtTime(gain, t);
      if (sus > 0) {
        g.gain.setTargetAtTime(Math.max(sus * gain, FLOOR), t + a, d / 3);
        if (rel > 0) g.gain.setTargetAtTime(FLOOR, t + a + d, rel / 3);
      } else {
        g.gain.setTargetAtTime(FLOOR, t + a, d / 3);
      }
    }

    const s = layer.source;
    let src: AudioScheduledSourceNode;
    const sources: AudioScheduledSourceNode[] = [];
    if (s.type === "noise") {
      const b = ctx.createBufferSource();
      b.buffer = noiseBuffer(ctx, dur + 0.1, s.color);
      src = b;
    } else {
      const o = ctx.createOscillator();
      o.type = s.type;
      const f = s.frequency;
      if (typeof f === "number") {
        o.frequency.setValueAtTime(f, t);
      } else {
        o.frequency.setValueAtTime(f.start, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(f.end, 1), t + Math.min(f.time ?? dur, dur));
      }
      if (s.detune) o.detune.value = s.detune;
      if (s.fm) {
        const carrier = typeof f === "number" ? f : f.start;
        const mod = ctx.createOscillator();
        mod.type = "sine";
        mod.frequency.value = carrier * s.fm.ratio;
        const mg = ctx.createGain();
        mg.gain.value = s.fm.depth;
        mod.connect(mg).connect(o.frequency);
        mod.start(t);
        mod.stop(t + dur + 0.1);
        sources.push(mod);
        nodes.push(mg);
      }
      src = o;
    }
    src.start(t);
    src.stop(t + dur + 0.1);
    sources.push(src);
    nodes.push(...sources);

    let node: AudioNode = src;
    const filters = !layer.filter ? [] : Array.isArray(layer.filter) ? layer.filter : [layer.filter];
    for (const f of filters) {
      const bq = ctx.createBiquadFilter();
      bq.type = f.type;
      bq.frequency.setValueAtTime(f.frequency, t);
      bq.Q.value = f.Q ?? f.resonance ?? 1;
      if (f.envelope) {
        const peakAt = t + (f.envelope.attack ?? 0);
        bq.frequency.linearRampToValueAtTime(f.envelope.peak, peakAt);
        bq.frequency.exponentialRampToValueAtTime(Math.max(f.frequency, 1), peakAt + f.envelope.decay);
      }
      node.connect(bq);
      node = bq;
      nodes.push(bq);
    }
    node.connect(g);

    let out: AudioNode = g;
    let tail = 0;
    for (const fx of layer.effects ?? []) {
      const built = fx.type === "reverb" ? reverb(ctx, fx) : fx.type === "delay" ? shimmer(ctx, fx) : null;
      if (!built) continue;
      out.connect(built.input);
      out = built.output;
      nodes.push(...built.nodes);
      tail = Math.max(tail, built.tail);
    }
    out.connect(destination);

    const ends = (layer.delay ?? 0) + dur + 0.1 + tail;
    longest = Math.max(longest, ends);
    // Nothing stays on the graph once it has rung out.
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.disconnect();
        } catch {}
      }
    }, (ends + 0.2) * 1000);
  }
  return longest;
}
