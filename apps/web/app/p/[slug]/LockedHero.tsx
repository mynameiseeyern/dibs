import { monogram } from "@dibs/shared/plans";
import type { MonogramColour } from "@dibs/shared/types";
import * as Avatar from "@/components/ui/avatar";

type Person = { id: string; display_name: string; colour: MonogramColour };

/**
 * The top of a plan page (voting or locked in): the crew pops up in a row, the raised one in the middle is you
 * (or the host, for someone just looking), like the hands-up logo. Empty seats show while it's
 * just one or two of you. Plays on every visit; reduced motion shows the last frame.
 */
export function LockedHero({ going, raisedId, isYou, label }: { going: Person[]; raisedId: string | null; isYou: boolean; label: string }) {
  const raised = going.find((p) => p.id === raisedId) ?? going[0] ?? null;
  const others = going.filter((p) => p !== raised);
  const shown = others.slice(0, 3);
  const more = others.length - shown.length;
  // Two seats each side of the raised one: people first, then "+N", then empty seats.
  const seats: ({ kind: "person"; p: Person } | { kind: "more"; n: number } | { kind: "empty" })[] = [
    ...shown.map((p) => ({ kind: "person" as const, p })),
    ...(more > 0 ? [{ kind: "more" as const, n: more }] : []),
  ];
  while (seats.length < 4) seats.push({ kind: "empty" });
  // Inner seats are bigger than the outer ones; the crew fills from the middle, "+N" ends up far right.
  const leftSide = [seats[2], seats[0]];
  const rightSide = [seats[1], seats[3]];
  const sizes = ["48", "56"] as const;

  const seat = (s: (typeof seats)[number], i: number, side: "l" | "r") => {
    const size = side === "l" ? sizes[i] : sizes[1 - i];
    const delay = { animationDelay: `${(side === "l" ? [140, 60] : [100, 180])[i]}ms` };
    if (s.kind === "empty") return <span key={`${side}${i}`} className={`locked-hero__seat locked-hero__seat--${size}`} style={delay} aria-hidden="true" />;
    return (
      <Avatar.Root key={`${side}${i}`} className="locked-hero__rise" style={delay} size={size} color={s.kind === "person" ? s.p.colour : "gray"} aria-hidden="true">
        {s.kind === "person" ? monogram(s.p.display_name) : `+${s.n}`}
      </Avatar.Root>
    );
  };

  return (
    <div className="locked-hero">
      <span className="locked-hero__spark locked-hero__spark--1" aria-hidden="true" />
      <span className="locked-hero__spark locked-hero__spark--2" aria-hidden="true" />
      <span className="locked-hero__spark locked-hero__spark--3" aria-hidden="true" />
      <div className="locked-hero__crew" aria-hidden="true">
        {leftSide.map((s, i) => seat(s, i, "l"))}
        {raised && (
          <Avatar.Root className={`locked-hero__raised${isYou && raisedId === raised.id ? " locked-hero__raised--you" : ""}`} size="72" color={raised.colour}>
            {isYou && raisedId === raised.id ? "You" : monogram(raised.display_name)}
          </Avatar.Root>
        )}
        {rightSide.map((s, i) => seat(s, i, "r"))}
      </div>
      {/* The crew is the signal; screen readers get the plan's state in words. */}
      <span className="sr-only">{label}</span>
    </div>
  );
}
