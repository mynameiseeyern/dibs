// A small crew monogram (initial on the person's colour), for the Dibby pieces. The full Avatar
// lives in components/ui; this is the 28px version chat and bills use inline.

import { Text, View } from "react-native";
import type { MonogramColour } from "@dibs/shared/types";
import { cn } from "@/utils/cn";

// Class names written out so Tailwind sees them.
const BG: Record<MonogramColour, string> = {
  violet: "bg-crew-violet",
  lime: "bg-crew-lime",
  sun: "bg-crew-sun",
  mint: "bg-crew-mint",
  tangerine: "bg-crew-tangerine",
  sky: "bg-crew-sky",
  coral: "bg-crew-coral",
  rose: "bg-crew-rose",
  aqua: "bg-crew-aqua",
  ivory: "bg-crew-ivory",
};

export function Monogram({ name, colour, size = 28, className }: { name: string; colour: MonogramColour; size?: 28 | 36; className?: string }) {
  return (
    <View
      accessible={false}
      className={cn("items-center justify-center rounded-full", size === 28 ? "size-7" : "size-9", BG[colour], className)}
    >
      <Text className={cn("text-static-black", size === 28 ? "text-label-xs" : "text-label-sm")}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}
