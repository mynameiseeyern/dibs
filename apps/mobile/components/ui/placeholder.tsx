// A text box's placeholder, drawn by us. On iOS a TextInput's own placeholder can come out in
// Times instead of the app's fonts (TestFlight, Nov 2026), so every text box keeps its native
// placeholder for screen readers but makes it transparent (placeholderTextColor="transparent")
// and draws this over the empty box instead, in the box's own font, size and padding.
//
// <View className="relative">
//   <Placeholder show={!value} className="inset-x-0 top-0 px-4 py-2.5 text-paragraph-md">Message</Placeholder>
//   <TextInput value={value} placeholder="Message" placeholderTextColor="transparent" … />
// </View>

import type { ReactNode } from "react";
import { Text } from "react-native";
import { cn } from "@/utils/cn";
import { useColour } from "@/lib/theme";

export function Placeholder({ show, className, disabled, ink, children }: { show: boolean; className?: string; disabled?: boolean; ink?: "soft" | "faint"; children?: ReactNode }) {
  const colour = useColour(disabled || ink === "faint" ? "text-disabled-300" : "text-soft-400");
  if (!show || !children) return null;
  return (
    <Text
      numberOfLines={1}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("absolute", className)}
      style={{ color: colour }}
    >
      {children}
    </Text>
  );
}
