// Crews on the home screen (ARV-90): one row into /crews, for signed-in people only.

import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CrewSummary } from "@dibs/shared/crews";
import * as Button from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TopBar } from "@/components/dibby/top-bar";
import { getMyCrews } from "@/lib/crews";

export function CrewsStrip() {
  const [crews, setCrews] = useState<CrewSummary[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      getMyCrews()
        .then((r) => setCrews(r.crews))
        .catch(() => setCrews((prev) => prev));
    }, [])
  );
  if (crews === null) return null;
  const label = crews.length === 0 ? "Make a crew" : crews.length === 1 ? crews[0].name : `${crews.length} crews`;
  const sub = crews.length === 0 ? "Same people, every plan, one list." : crews.map((c) => c.name).join(", ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={crews.length === 0 ? "Make a crew" : `Your crews: ${sub}`}
      onPress={() => router.push(crews.length === 0 ? "/crews/new" : "/crews")}
      className="flex-row items-center gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3 active:opacity-80"
    >
      <View className="h-11 min-w-11 flex-row items-center justify-center rounded-lg bg-primary-lighter px-2">
        {crews.length === 0 ? (
          <Icon name="group-line" className="text-[22px] leading-[24px] text-primary-dark" />
        ) : (
          crews.slice(0, 3).map((c) => (
            <Text key={c.id} className="text-[20px] leading-[26px]">
              {c.emoji}
            </Text>
          ))
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-label-md text-text-strong-950">
          {label}
        </Text>
        <Text numberOfLines={1} className="text-paragraph-sm text-text-sub-600">
          {sub}
        </Text>
      </View>
      <Icon name="arrow-right-s-line" className="text-[22px] leading-[24px] text-text-soft-400" />
    </Pressable>
  );
}

/** Crews are accounts only: anyone signed out lands here instead. */
export function NeedsAccount() {
  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <TopBar />
      <View className="flex-1 gap-2 p-4 pt-8">
        <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
          Crews need an account
        </Text>
        <Text className="text-paragraph-lg text-text-sub-600">Sign in with your email so your crew can find you on any phone.</Text>
      </View>
      <View className="p-4">
        <Button.Root size="large" block onPress={() => router.replace("/sign-in")}>
          Sign in
        </Button.Root>
      </View>
    </SafeAreaView>
  );
}
