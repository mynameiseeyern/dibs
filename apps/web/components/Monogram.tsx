import { monogram } from "@dibs/shared/plans";
import type { MonogramColour } from "@dibs/shared/types";
import * as Avatar from "@/components/ui/avatar";
import * as AvatarGroup from "@/components/ui/avatar-group";

const SIZE = { sm: "32", md: "40", lg: "56" } as const;

export function Monogram({ name, colour, size }: { name: string; colour: MonogramColour; size?: "sm" | "lg" }) {
  return (
    <Avatar.Root color={colour} size={SIZE[size ?? "md"]} aria-hidden="true">
      {monogram(name)}
    </Avatar.Root>
  );
}

export function MonogramStack({ people, max = 5 }: { people: { display_name: string; colour: MonogramColour; id: string }[]; max?: number }) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <AvatarGroup.Root size="32" aria-hidden="true">
      {shown.map((p) => (
        <Monogram key={p.id} name={p.display_name} colour={p.colour} size="sm" />
      ))}
      {more > 0 && <AvatarGroup.Overflow>+{more}</AvatarGroup.Overflow>}
    </AvatarGroup.Root>
  );
}
