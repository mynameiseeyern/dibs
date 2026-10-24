/** Haptic patterns in ms (buzz, gap, buzz…). Plain data so server pages can pass them to buttons. */
export const HAPTICS = {
  /** The wheel lands. */
  roulette: [40, 60, 120],
  /** The plan locks in. */
  locked: [30, 50, 30],
  /** Paid, or confirmed someone paid. */
  paid: [25],
} as const;
