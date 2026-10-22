import * as THREE from "three";

/**
 * Shared bits for the Dibs 3D moments. A small transparent canvas, the brand palette
 * read from the page's CSS variables (so dark mode and token changes carry through),
 * and a run loop that stops itself: nothing loops in the background.
 */

export type Palette = { violet: THREE.Color; lime: THREE.Color; ink: THREE.Color; white: THREE.Color; soft: THREE.Color };

export function palette(el: HTMLElement): Palette {
  const css = getComputedStyle(el);
  const read = (name: string, fallback: string) => new THREE.Color(css.getPropertyValue(name).trim() || fallback);
  return {
    violet: read("--primary-base", "#6d4aff"),
    lime: read("--accent-base", "#c8f03c"),
    ink: read("--static-black", "#141216"),
    white: read("--static-white", "#ffffff"),
    soft: read("--bg-soft-200", "#eeecf2"),
  };
}

export const matte = (color: THREE.Color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 });

export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** Runs `tick(t)` (t in seconds since start) each frame until it returns false, then renders once more and stops. */
  run(tick: (t: number) => boolean, onDone?: () => void): void;
  dispose(): void;
}

export function stage(canvas: HTMLCanvasElement, size: number): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 1.6, 7);
  camera.lookAt(0, 0.4, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a80a0, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  scene.add(key);

  let frame = 0;
  let disposed = false;
  return {
    scene,
    camera,
    renderer,
    run(tick, onDone) {
      const start = performance.now();
      const step = () => {
        if (disposed) return;
        const more = tick((performance.now() - start) / 1000);
        renderer.render(scene, camera);
        if (more) frame = requestAnimationFrame(step);
        else onDone?.();
      };
      frame = requestAnimationFrame(step);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
    },
  };
}

const CREW = ["violet", "lime", "sun", "mint", "tangerine", "sky", "coral", "rose", "aqua", "ivory"] as const;
export type CrewName = (typeof CREW)[number];

/** The Higgsfield-made crew art in /public/crew, if it's been added. Null when it hasn't. */
export function crewTexture(name: string): Promise<THREE.Texture | null> {
  if (!CREW.includes(name as CrewName)) return Promise.resolve(null);
  return loadTexture(`/crew/${name}.png`);
}

/** A clay prop from /public/crew as a camera-facing billboard, `h` units tall, base at y=0. Null if the art isn't there. */
export async function prop(name: string, h: number): Promise<THREE.Mesh | null> {
  const tex = await loadTexture(`/crew/${name}.png`);
  if (!tex) return null;
  const img = tex.image as { width: number; height: number };
  const w = h * (img.width / img.height);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02 }));
  m.position.y = h / 2;
  return m;
}

const loaded = new Map<string, Promise<THREE.Texture | null>>();
function loadTexture(url: string): Promise<THREE.Texture | null> {
  if (!loaded.has(url)) {
    loaded.set(
      url,
      new Promise((resolve) => {
        new THREE.TextureLoader().load(
          url,
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            resolve(t);
          },
          undefined,
          () => resolve(null)
        );
      })
    );
  }
  return loaded.get(url)!;
}

/**
 * A crew member. With the art in place it's a billboard that always faces the camera,
 * sized like the capsule figure (2.1 tall, feet at y=0); otherwise the built-in figure.
 */
export async function crew(name: string, fallback: THREE.Color, p: Palette): Promise<THREE.Group> {
  const tex = await crewTexture(name);
  if (!tex) return figure(fallback, p);
  const g = new THREE.Group();
  const h = 2.1;
  const w = h * ((tex.image as { width: number }).width / (tex.image as { height: number }).height);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02 }));
  m.position.y = h / 2;
  g.add(m);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), new THREE.MeshBasicMaterial({ color: p.ink, transparent: true, opacity: 0.12 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  g.add(shadow);
  return g;
}

/** The built-in crew figure: round head on a pill body, like the logo's dots. */
export function figure(color: THREE.Color, p: Palette): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.7, 6, 16), matte(color));
  body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), matte(color));
  head.position.y = 1.72;
  const eyeMat = matte(p.ink);
  for (const x of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), eyeMat);
    eye.position.set(x, 1.78, 0.36);
    g.add(eye);
  }
  g.add(body, head);
  return g;
}

/** Confetti: flat squares in the brand colours that fall and tumble. */
export function confetti(count: number, p: Palette): { group: THREE.Group; update: (t: number) => void } {
  const group = new THREE.Group();
  const colors = [p.lime, p.violet, p.white, p.lime];
  const geo = new THREE.PlaneGeometry(0.16, 0.16);
  const bits: { m: THREE.Mesh; vx: number; vy: number; vz: number; r: number; delay: number }[] = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide, roughness: 0.8 });
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    group.add(m);
    const a = Math.random() * Math.PI * 2;
    bits.push({ m, vx: Math.cos(a) * (1.5 + Math.random() * 2), vy: 4 + Math.random() * 3, vz: Math.sin(a) * (1 + Math.random()), r: Math.random() * 6, delay: Math.random() * 0.15 });
  }
  return {
    group,
    update(t) {
      for (const b of bits) {
        const u = t - b.delay;
        if (u < 0) continue;
        b.m.visible = true;
        b.m.position.set(b.vx * u, 1.2 + b.vy * u - 6 * u * u, b.vz * u);
        b.m.rotation.set(b.r * u, b.r * u * 0.7, b.r * u * 0.4);
        (b.m.material as THREE.MeshStandardMaterial).opacity = clamp01(2.4 - u);
        (b.m.material as THREE.MeshStandardMaterial).transparent = true;
      }
    },
  };
}
