import { monogram } from "@dibs/shared/plans";
import type { MonogramColour } from "@dibs/shared/types";

export function Monogram({ name, colour, size }: { name: string; colour: MonogramColour; size?: "sm" | "lg" }) {
  return (
    <span className={`db-avatar db-avatar--${colour}${size ? ` db-avatar--${size}` : ""}`} aria-hidden="true">
      {monogram(name)}
    </span>
  );
}

export function MonogramStack({ people, max = 5 }: { people: { display_name: string; colour: MonogramColour; id: string }[]; max?: number }) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <span className="db-avatar-group" aria-hidden="true">
      {shown.map((p) => (
        <Monogram key={p.id} name={p.display_name} colour={p.colour} size="sm" />
      ))}
      {more > 0 && <span className="db-avatar db-avatar--sm db-avatar--more">+{more}</span>}
    </span>
  );
}
