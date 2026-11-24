// The top of every screen with a way back, drawn by us instead of iOS's navigation bar. On iOS 26
// the native bar puts a grey glass bubble behind the back button and anything in it, which isn't
// the design (TestFlight, Nov 2026). The stack's swipe-back still works: only the bar is ours.

import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/icon";

/** Height of the bar under the status bar; screens that offset the keyboard add the top inset to it. */
export const TOP_BAR = 44;

export function TopBar({ title, right }: { title?: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  // Opened straight from a link there's nothing to go back to, so back goes home.
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return (
    <View style={{ paddingTop: insets.top }} className="bg-bg-white-0">
      <View style={{ height: TOP_BAR }} className="flex-row items-center px-1">
        <Pressable accessibilityRole="button" accessibilityLabel={router.canGoBack() ? "Back" : "Home"} hitSlop={8} onPress={back} className="size-11 items-center justify-center active:opacity-60">
          <Icon name="arrow-left-s-line" className="text-[28px] leading-[28px] text-text-strong-950" />
        </Pressable>
        <Text numberOfLines={1} accessibilityRole="header" className="flex-1 text-center text-label-md text-text-strong-950">
          {title ?? ""}
        </Text>
        <View className="min-w-11 items-end justify-center pr-2">{right}</View>
      </View>
    </View>
  );
}
