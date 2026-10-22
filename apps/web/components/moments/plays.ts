import * as THREE from "three";
import { clamp01, confetti, crew, easeOutBack, easeOutCubic, matte, palette, prop, stage, type Stage } from "./scene";

export type MomentKind = "pop" | "lock" | "square" | "paid";

/** Each moment: builds its scene, plays once, and resolves when it's done. */
export function play(kind: MomentKind, canvas: HTMLCanvasElement, size: number, colour?: string): { done: Promise<void>; dispose: () => void } {
  const el = canvas.parentElement ?? canvas;
  const p = palette(el);
  const s = stage(canvas, size);
  const done = new Promise<void>((resolve) => {
    PLAYS[kind](s, p, colour ? crewColour(colour, el) : p.lime, colour ?? "lime").then((tick) => s.run(tick, resolve));
  });
  return { done, dispose: () => s.dispose() };
}

/** A crew member's monogram colour (violet, lime, sun, mint, tangerine) as the matching token. */
function crewColour(name: string, el: HTMLElement): THREE.Color {
  const token = { violet: "--primary-light", lime: "--accent-base", sun: "--away-light", mint: "--success-light", tangerine: "--highlighted-light", sky: "--information-light", coral: "--error-light", rose: "--feature-light", aqua: "--verified-light", ivory: "--stable-light" }[name as keyof object];
  const v = token ? getComputedStyle(el).getPropertyValue(token).trim() : "";
  return new THREE.Color(v || "#c8f03c");
}

type Play = (s: Stage, p: ReturnType<typeof palette>, colour: THREE.Color, name: string) => Promise<(t: number) => boolean>;

/** Calling dibs: a crew figure springs up from the ground and does a little hop. */
const pop: Play = async (s, p, colour, name) => {
  const f = await crew(name, colour, p);
  f.scale.setScalar(0.001);
  s.scene.add(f);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.5, 32), new THREE.MeshBasicMaterial({ color: p.lime, transparent: true, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  s.scene.add(ring);
  return (t) => {
    const up = easeOutBack(clamp01(t / 0.5));
    f.scale.set(up, up, up);
    f.position.y = t > 0.5 ? Math.abs(Math.sin((t - 0.5) * 9)) * 0.35 * Math.max(0, 1.1 - t) : 0;
    f.rotation.z = Math.sin(t * 3) * 0.12 * clamp01(1.6 - t);
    const r = clamp01((t - 0.3) / 0.6);
    ring.scale.setScalar(1 + r * 3);
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - r);
    return t < 1.6;
  };
};

/** Locked in: a flag plants in the ground with a thunk and a puff of confetti. */
const lock: Play = async (s, p) => {
  const art = await prop("flag", 3.2);
  if (art) {
    const g = new THREE.Group();
    g.add(art);
    g.position.y = 4;
    s.scene.add(g);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), new THREE.MeshBasicMaterial({ color: p.ink, transparent: true, opacity: 0.12 }));
    ground.rotation.x = -Math.PI / 2;
    s.scene.add(ground);
    const c = confetti(36, p);
    c.group.visible = false;
    s.scene.add(c.group);
    let landed = false;
    return (t) => {
      const drop = easeOutCubic(clamp01(t / 0.45));
      g.position.y = 4 * (1 - drop);
      if (t >= 0.45 && !landed) {
        landed = true;
        c.group.visible = true;
      }
      if (landed) {
        const u = t - 0.45;
        g.position.y = -Math.sin(Math.min(u, 0.3) * Math.PI / 0.3) * 0.08;
        g.rotation.z = Math.sin(u * 7) * 0.08 * Math.max(0, 1.5 - u);
        c.update(u);
      }
      return t < 2.4;
    };
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 12), matte(p.ink));
  pole.position.y = 1.3;
  const flag = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 0.04), matte(p.violet));
  flag.position.set(0.7, 2.2, 0);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), matte(p.lime));
  dot.position.set(0.7, 2.2, 0.05);
  const g = new THREE.Group();
  g.add(pole, flag, dot);
  g.position.y = 4;
  s.scene.add(g);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), matte(p.soft));
  ground.rotation.x = -Math.PI / 2;
  s.scene.add(ground);
  const c = confetti(36, p);
  c.group.visible = false;
  s.scene.add(c.group);
  let landed = false;
  return (t) => {
    const drop = easeOutCubic(clamp01(t / 0.45));
    g.position.y = 4 * (1 - drop);
    if (t >= 0.45 && !landed) {
      landed = true;
      c.group.visible = true;
    }
    if (landed) {
      const u = t - 0.45;
      g.position.y = -Math.sin(Math.min(u, 0.3) * Math.PI / 0.3) * 0.08; // thunk
      flag.rotation.y = Math.sin(u * 7) * 0.25 * Math.max(0, 1.5 - u);
      c.update(u);
    }
    return t < 2.4;
  };
};

/** Everyone's square: the crew pops up together and confetti rains. */
const square: Play = async (s, p) => {
  const el = s.renderer.domElement.parentElement ?? s.renderer.domElement;
  const names = ["lime", "violet", "sun", "mint", "tangerine"];
  const figs = (await Promise.all(names.map((n) => crew(n, crewColour(n, el), p)))).map((f, i) => {
    f.position.x = (i - 2) * 1.05;
    f.position.z = i % 2 ? -0.4 : 0.2;
    f.scale.setScalar(0.001);
    s.scene.add(f);
    return f;
  });
  const c = confetti(60, p);
  s.scene.add(c.group);
  s.camera.position.set(0, 2.2, 8.5);
  s.camera.lookAt(0, 0.8, 0);
  return (t) => {
    figs.forEach((f, i) => {
      const u = easeOutBack(clamp01((t - i * 0.08) / 0.5));
      f.scale.set(u, u, u);
      f.position.y = Math.max(0, Math.sin(t * 6 + i)) * 0.3 * clamp01(2.2 - t);
      f.rotation.z = Math.sin(t * 2 + i) * 0.1 * clamp01(2.6 - t);
    });
    c.update(t - 0.3);
    return t < 2.8;
  };
};

/** Paid: a coin flips up and drops into a lime tick. Short and sweet. */
const paid: Play = async (s, p) => {
  const [coinArt, tickArt] = await Promise.all([prop("coin", 1.6), prop("tick", 1.5)]);
  if (coinArt && tickArt) {
    coinArt.position.y = 0.8;
    tickArt.scale.setScalar(0.001);
    tickArt.position.z = 0.6;
    s.scene.add(coinArt, tickArt);
    return (t) => {
      // the coin flips (squash on x reads as a spin for a billboard) and rises, then shrinks away as the tick lands
      coinArt.scale.x = Math.abs(Math.cos(t * 9)) * (1 - clamp01((t - 0.55) / 0.25) * 0.999);
      coinArt.scale.y = 1 - clamp01((t - 0.55) / 0.25) * 0.999;
      coinArt.position.y = 0.8 + Math.sin(Math.min(t, 0.6) * Math.PI / 0.6) * 1.2;
      const u = easeOutBack(clamp01((t - 0.6) / 0.4));
      tickArt.scale.set(u, u, u);
      return t < 1.4;
    };
  }
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 32), matte(p.lime));
  coin.rotation.x = Math.PI / 2;
  coin.position.y = 0.8;
  s.scene.add(coin);
  const tick = new THREE.Group();
  // A tick: short stroke down-right, long stroke up-right, meeting at the bottom.
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), matte(p.ink));
  a.position.set(-0.28, 0.62, 0);
  a.rotation.z = 0.75;
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.25, 0.16), matte(p.ink));
  b.position.set(0.22, 0.85, 0);
  b.rotation.z = -0.65;
  tick.add(a, b);
  tick.scale.setScalar(0.001);
  s.scene.add(tick);
  tick.position.z = 1.2;
  return (t) => {
    coin.rotation.y = t * 9;
    coin.position.y = 0.8 + Math.sin(Math.min(t, 0.6) * Math.PI / 0.6) * 1.2;
    const gone = clamp01((t - 0.55) / 0.25);
    coin.scale.setScalar(1 - gone * 0.999);
    const u = easeOutBack(clamp01((t - 0.6) / 0.4));
    tick.scale.set(u, u, u);
    return t < 1.4;
  };
};

const PLAYS: Record<MomentKind, Play> = { pop, lock, square, paid };
