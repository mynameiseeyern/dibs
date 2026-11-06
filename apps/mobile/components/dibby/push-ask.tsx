import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Button from "@/components/ui/button";
import { turnOnPush, useShouldAskPush } from "@/lib/push";
import { DIBBY } from "./flow";

/**
 * Asking for notifications, once there's a plan worth hearing about (never on first launch).
 * Ours first, so "Not now" doesn't spend the one system prompt iOS gives us. Shows nothing once
 * they've decided, or waved it off before.
 */
export function PushAsk({ delay = 0 }: { delay?: number }) {
  const { ask, dismiss } = useShouldAskPush();
  const [busy, setBusy] = useState(false);
  if (!ask) return null;

  return (
    <Animated.View entering={FadeIn.duration(300).delay(delay)} exiting={FadeOut.duration(160)} className="flex-row gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-4">
      <Image source={DIBBY.phone} style={{ width: 48, height: 48 }} contentFit="contain" accessible={false} />
      <View className="flex-1 gap-3">
        <View className="gap-0.5">
          <Text className="text-label-md text-text-strong-950">Get a ping when the crew replies</Text>
          <Text className="text-paragraph-sm text-text-sub-600">Who&rsquo;s in, the chat, and when the plan&rsquo;s locked. Nothing else.</Text>
        </View>
        <View className="flex-row gap-2">
          <Button.Root
            size="small"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              if (await turnOnPush()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              dismiss();
            }}
          >
            Turn on
          </Button.Root>
          <Button.Root size="small" variant="neutral" mode="ghost" onPress={dismiss}>
            Not now
          </Button.Root>
        </View>
      </View>
    </Animated.View>
  );
}
