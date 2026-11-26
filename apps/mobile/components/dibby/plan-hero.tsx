// The round buttons on a plan page (.circle-action on the web): Share, Calendar, Directions, Chat.
// The top of the page (the group selfie and the ticket) is in selfie.tsx.

import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/ui/icon";
import { useShadow } from "@/lib/theme";
import { cn } from "@/utils/cn";

/** A round button with its label under it (.circle-action). `dibs`: the lime one, for Share. */
export function CircleAction({ icon, label, onPress, dibs, badge }: { icon: IconName; label: string; onPress: () => void; dibs?: boolean; badge?: number }) {
  const shadow = useShadow(dibs ? "pop" : "clay-sm");
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={badge ? `${label}, ${badge} new` : label} onPress={onPress} className="min-w-16 items-center gap-1.5 active:opacity-80">
      <View
        className={cn("size-12 items-center justify-center rounded-full", dibs ? "border-2 border-static-black bg-accent-base" : "bg-bg-soft-200")}
        style={shadow}
      >
        <Icon name={icon} className={dibs ? "text-[22px] leading-[22px] text-static-black" : "text-[22px] leading-[22px] text-text-strong-950"} />
        {badge ? (
          <View className="absolute -right-1 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full border-2 border-bg-white-0 bg-primary-base px-1">
            <Text className="text-[11px] font-sans-semibold leading-[14px] text-static-white">{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-[12px] font-sans-semibold leading-[16px] text-text-sub-600">{label}</Text>
    </Pressable>
  );
}
