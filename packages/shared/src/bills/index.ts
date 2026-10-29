// Bill maths for Dibby. Pure functions, integer cents only. Shares always add up to the total.

export type SplitMode = "even" | "amount" | "percent" | "exclude" | "roulette";

export interface BillPerson {
  id: string;
  /** Plus-ones this person brought. Each adds one more even share to them. */
  plusOnes?: number;
}

export interface BillInput {
  totalCents: number;
  payerId: string;
  mode: SplitMode;
  /** Stored on the bill so the leftover-cents pick replays the same way. */
  seed: string;
  /** mode "amount": cents per person id. */
  amounts?: Record<string, number>;
  /** mode "percent": basis points per person id (100% = 10000). */
  basisPoints?: Record<string, number>;
  /** mode "exclude": people left off this bill. */
  excludedIds?: string[];
  /** mode "roulette": whoever the wheel landed on. */
  rouletteLoserId?: string;
}

export interface Share {
  personId: string;
  cents: number;
  /** The payer never owes themselves, so their share starts confirmed. */
  status: "owed" | "confirmed";
}

export class BillError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillError";
  }
}

/** Small seeded random number generator (mulberry32) so picks are repeatable. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks one id from a list using the seed. Same seed and list, same pick. */
export function seededPick<T>(items: readonly T[], seed: string): T {
  if (items.length === 0) throw new BillError("Nobody to pick from");
  const sorted = [...items].sort();
  const i = Math.floor(seededRandom(seed)() * sorted.length);
  return sorted[i] as T;
}

/** Spin the card roulette wheel: only people who opted in are entrants. */
/** No roulette over this. Big bills get split; the game is for rounds, not rent. */
export const ROULETTE_CAP_CENTS = 300_00;

export function rouletteAllowed(totalCents: number): boolean {
  return totalCents > 0 && totalCents <= ROULETTE_CAP_CENTS;
}

export interface RouletteRecord {
  memberId: string;
  /** Times on the wheel. */
  played: number;
  /** Times it landed on them. */
  lost: number;
  /** Total they ended up paying from losses, in cents. */
  paidCents: number;
}

/** Wins and losses per person across a set of spun roulette bills. */
export function rouletteTally(bills: readonly { roulette_entrants: readonly string[]; roulette_loser_id: string | null; total_cents: number }[]): RouletteRecord[] {
  const by = new Map<string, RouletteRecord>();
  for (const b of bills) {
    if (!b.roulette_loser_id) continue;
    for (const id of b.roulette_entrants) {
      const r = by.get(id) ?? { memberId: id, played: 0, lost: 0, paidCents: 0 };
      r.played++;
      if (id === b.roulette_loser_id) {
        r.lost++;
        r.paidCents += b.total_cents;
      }
      by.set(id, r);
    }
  }
  // Unluckiest first, then most played.
  return [...by.values()].sort((a, b) => b.lost - a.lost || b.paidCents - a.paidCents || b.played - a.played);
}

export function spinRoulette(entrantIds: readonly string[], seed: string): string {
  if (entrantIds.length < 2) throw new BillError("The wheel needs at least 2 people in");
  return seededPick(entrantIds, seed);
}

function assertCents(n: number, what: string) {
  if (!Number.isInteger(n) || n < 0) throw new BillError(`${what} must be a whole number of cents, 0 or more`);
}

export function splitBill(bill: BillInput, people: readonly BillPerson[]): Share[] {
  assertCents(bill.totalCents, "Total");
  if (people.length === 0) throw new BillError("A bill needs at least one person");
  const ids = new Set(people.map((p) => p.id));
  if (ids.size !== people.length) throw new BillError("Someone is on the bill twice");

  const cents = new Map<string, number>(people.map((p) => [p.id, 0]));

  switch (bill.mode) {
    case "even":
    case "exclude": {
      const excluded = new Set(bill.mode === "exclude" ? bill.excludedIds ?? [] : []);
      const on = people.filter((p) => !excluded.has(p.id));
      if (on.length === 0) throw new BillError("Everyone is excluded");
      const units = (p: BillPerson) => 1 + Math.max(0, Math.floor(p.plusOnes ?? 0));
      const totalUnits = on.reduce((s, p) => s + units(p), 0);
      const base = Math.floor(bill.totalCents / totalUnits);
      for (const p of on) cents.set(p.id, base * units(p));
      giveLeftover(cents, bill, on.map((p) => p.id));
      break;
    }
    case "amount": {
      const amounts = bill.amounts ?? {};
      let sum = 0;
      for (const [id, c] of Object.entries(amounts)) {
        if (!ids.has(id)) throw new BillError("An amount is set for someone not on the bill");
        assertCents(c, "Each amount");
        cents.set(id, c);
        sum += c;
      }
      if (sum !== bill.totalCents) {
        throw new BillError(`Amounts add up to ${sum} cents, but the bill is ${bill.totalCents}`);
      }
      break;
    }
    case "percent": {
      const bp = bill.basisPoints ?? {};
      let sumBp = 0;
      const on: string[] = [];
      for (const [id, b] of Object.entries(bp)) {
        if (!ids.has(id)) throw new BillError("A percentage is set for someone not on the bill");
        if (!Number.isInteger(b) || b < 0) throw new BillError("Percentages must be whole basis points");
        sumBp += b;
        if (b > 0) on.push(id);
        cents.set(id, Math.floor((bill.totalCents * b) / 10000));
      }
      if (sumBp !== 10000) throw new BillError(`Percentages add up to ${sumBp / 100}%, not 100%`);
      giveLeftover(cents, bill, on);
      break;
    }
    case "roulette": {
      const loser = bill.rouletteLoserId;
      if (!loser || !ids.has(loser)) throw new BillError("Spin the wheel before saving this bill");
      cents.set(loser, bill.totalCents);
      break;
    }
  }

  return people.map((p) => ({
    personId: p.id,
    cents: cents.get(p.id) ?? 0,
    status: p.id === bill.payerId ? "confirmed" : "owed",
  }));
}

/** Leftover cents from rounding go to one person, picked with the bill's seed. */
function giveLeftover(cents: Map<string, number>, bill: BillInput, eligible: string[]) {
  let sum = 0;
  for (const c of cents.values()) sum += c;
  const left = bill.totalCents - sum;
  if (left === 0 || eligible.length === 0) return;
  const lucky = seededPick(eligible, `${bill.seed}:leftover`);
  cents.set(lucky, (cents.get(lucky) ?? 0) + left);
}

/** What each person owes the payer, leaving out the payer's own share. */
export function owedToPayer(shares: readonly Share[], payerId: string): Share[] {
  return shares.filter((s) => s.personId !== payerId && s.cents > 0);
}

export interface Debt {
  from: string;
  to: string;
  cents: number;
}

/**
 * Nets debts between each pair of people, across all their bills: if Ee owes Sam $20 for
 * dinner and Sam owes Ee $5 for drinks, Ee pays Sam $15 and that's it. Pairwise only:
 * money never routes through a third person, so nobody pays someone they didn't owe.
 * Returns one debt per pair that still owes something, in a stable order.
 */
export function netDebts(debts: readonly Debt[]): Debt[] {
  const pairs = new Map<string, { a: string; b: string; aToB: number }>();
  for (const d of debts) {
    assertCents(d.cents, "Each debt");
    if (d.from === d.to || d.cents === 0) continue;
    const [a, b] = d.from < d.to ? [d.from, d.to] : [d.to, d.from];
    const key = `${a}|${b}`;
    const p = pairs.get(key) ?? { a, b, aToB: 0 };
    p.aToB += d.from === a ? d.cents : -d.cents;
    pairs.set(key, p);
  }
  const out: Debt[] = [];
  for (const p of [...pairs.values()].sort((x, y) => `${x.a}|${x.b}`.localeCompare(`${y.a}|${y.b}`))) {
    if (p.aToB > 0) out.push({ from: p.a, to: p.b, cents: p.aToB });
    else if (p.aToB < 0) out.push({ from: p.b, to: p.a, cents: -p.aToB });
  }
  return out;
}

export function formatAud(cents: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
}
