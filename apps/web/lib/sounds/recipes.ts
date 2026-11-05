/**
 * Dibby's sound recipes. Data only, so server pages can name a sound and pass it to a client
 * button (`sound="paid"`). Played by `play()` in `lib/feedback.ts`.
 *
 * Every sound is synthesised from these numbers with Web Audio: there are no audio files.
 * They come from the procedural-sounds library (github.com/m1ckc3s/procedural-sounds, MIT),
 * picked from its soft, core and playful packs, with that library's loudness levelling baked
 * into the gains. To swap one: audition at procedural-sounds.vercel.app, "Copy sound", and
 * paste the object in place of the one here. Keep the pack/name note up to date.
 */
import type { Patch } from "./player";

export const SOUNDS = {
  /** Any tap that needs a little answer: RSVP maybe or out, chips. (soft/tap) */
  tap: {"source":{"type":"triangle","frequency":800},"envelope":{"attack":0.005,"decay":0.08,"sustain":0,"release":0.03},"gain":0.174},
  /** Ticking a place on the vote. (soft/select) */
  select: {"source":{"type":"triangle","frequency":750},"envelope":{"attack":0.006,"decay":0.1,"sustain":0,"release":0.04},"gain":0.14},
  /** Unticking a place. (soft/deselect) */
  deselect: {"source":{"type":"triangle","frequency":600},"envelope":{"attack":0.006,"decay":0.09,"sustain":0,"release":0.035},"gain":0.11},
  /** A switch turning on. (soft/toggle-on) */
  toggleOn: {"layers":[{"source":{"type":"triangle","frequency":440},"envelope":{"attack":0.008,"decay":0.12,"sustain":0,"release":0.05},"gain":0.15},{"source":{"type":"triangle","frequency":660},"envelope":{"attack":0.008,"decay":0.12,"sustain":0,"release":0.05},"delay":0.05,"gain":0.13}]},
  /** A switch turning off. (soft/toggle-off) */
  toggleOff: {"layers":[{"source":{"type":"triangle","frequency":660},"envelope":{"attack":0.008,"decay":0.12,"sustain":0,"release":0.05},"gain":0.15},{"source":{"type":"triangle","frequency":440},"envelope":{"attack":0.008,"decay":0.12,"sustain":0,"release":0.05},"delay":0.05,"gain":0.13}]},
  /** Your message goes into the chat. (soft/send) */
  send: {"source":{"type":"triangle","frequency":{"start":400,"end":800}},"envelope":{"attack":0.005,"decay":0.15,"sustain":0,"release":0.06},"gain":0.143},
  /** Someone else posts in the chat while you are on the page. (core/receive) */
  receive: {"source":{"type":"sine","frequency":{"start":1200,"end":700}},"envelope":{"attack":0,"decay":0.12,"sustain":0.02,"release":0.04},"gain":0.128},
  /** Dibby replies in the chat. (core/sparkle) */
  dibby: {"layers":[{"source":{"type":"sine","frequency":1047,"detune":7,"fm":{"ratio":3.5,"depth":200}},"envelope":{"attack":0,"decay":0.4,"sustain":0.04,"release":0.18},"effects":[{"type":"reverb","decay":0.8,"damping":0.5,"mix":0.15}],"gain":0.12},{"source":{"type":"sine","frequency":1050,"fm":{"ratio":3.5,"depth":180}},"envelope":{"attack":0,"decay":0.38,"sustain":0.03,"release":0.18},"gain":0.08}]},
  /** A link or PayID copied. (soft/copy) */
  copy: {"layers":[{"source":{"type":"triangle","frequency":700},"envelope":{"attack":0.005,"decay":0.06,"sustain":0,"release":0.025},"gain":0.186},{"source":{"type":"triangle","frequency":900},"envelope":{"attack":0.005,"decay":0.06,"sustain":0,"release":0.025},"delay":0.06,"gain":0.158}]},
  /** Couldn't save something. (soft/error) */
  error: {"layers":[{"source":{"type":"triangle","frequency":300},"envelope":{"attack":0.005,"decay":0.2,"sustain":0,"release":0.08},"gain":0.125},{"source":{"type":"triangle","frequency":280},"envelope":{"attack":0.005,"decay":0.18,"sustain":0,"release":0.07},"delay":0.015,"gain":0.097}]},
  /** You're in: calling dibs on a spot. (playful/pop) */
  pop: {"source":{"type":"sine","frequency":{"start":600,"end":150},"fm":{"ratio":0.5,"depth":40}},"envelope":{"attack":0,"decay":0.1,"sustain":0,"release":0.035},"gain":0.163},
  /** The plan locks in. (core/success) */
  locked: {"layers":[{"source":{"type":"sine","frequency":523},"envelope":{"attack":0.003,"decay":0.3,"sustain":0.06,"release":0.1},"gain":0.16},{"source":{"type":"sine","frequency":659},"envelope":{"attack":0.003,"decay":0.28,"sustain":0.05,"release":0.1},"delay":0.07,"gain":0.14},{"source":{"type":"sine","frequency":{"start":784,"end":880}},"envelope":{"attack":0.003,"decay":0.32,"sustain":0.06,"release":0.12},"delay":0.14,"gain":0.15}]},
  /** Paid, or confirmed someone paid. (core/complete) */
  paid: {"layers":[{"source":{"type":"sine","frequency":523},"envelope":{"attack":0.003,"decay":0.35,"sustain":0.05,"release":0.1},"gain":0.15},{"source":{"type":"sine","frequency":659},"envelope":{"attack":0.003,"decay":0.35,"sustain":0.05,"release":0.1},"delay":0.015,"gain":0.13},{"source":{"type":"sine","frequency":784},"envelope":{"attack":0.003,"decay":0.35,"sustain":0.05,"release":0.1},"delay":0.03,"gain":0.12},{"source":{"type":"sine","frequency":{"start":1046,"end":1175}},"envelope":{"attack":0.003,"decay":0.3,"sustain":0.04,"release":0.12},"delay":0.045,"gain":0.1}]},
  /** Everyone's square. (core/confetti) */
  square: {"layers":[{"source":{"type":"sine","frequency":523},"envelope":{"attack":0.002,"decay":0.18,"sustain":0.04,"release":0.08},"gain":0.109},{"source":{"type":"sine","frequency":659},"envelope":{"attack":0.002,"decay":0.18,"sustain":0.04,"release":0.08},"delay":0.06,"gain":0.109},{"source":{"type":"sine","frequency":784},"envelope":{"attack":0.002,"decay":0.18,"sustain":0.03,"release":0.08},"delay":0.12,"gain":0.094},{"source":{"type":"sine","frequency":{"start":1047,"end":1175}},"envelope":{"attack":0.002,"decay":0.2,"sustain":0.03,"release":0.1},"delay":0.18,"gain":0.078}]},
  /** A new plan is made. (core/level-up) */
  made: {"layers":[{"source":{"type":"sine","frequency":440},"envelope":{"attack":0.003,"decay":0.25,"sustain":0.06,"release":0.1},"gain":0.15},{"source":{"type":"sine","frequency":554},"envelope":{"attack":0.003,"decay":0.25,"sustain":0.05,"release":0.1},"delay":0.07,"gain":0.14},{"source":{"type":"sine","frequency":660},"envelope":{"attack":0.003,"decay":0.28,"sustain":0.05,"release":0.1},"delay":0.14,"gain":0.13},{"source":{"type":"sine","frequency":{"start":880,"end":990}},"envelope":{"attack":0.003,"decay":0.22,"sustain":0.04,"release":0.12},"delay":0.21,"gain":0.08}]},
} satisfies Record<string, Patch>;

export type SoundName = keyof typeof SOUNDS;
