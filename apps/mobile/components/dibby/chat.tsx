// The group chat, ported from `.db-chat` / `.db-msg` (docs/components/ChatBubble.md).
// Others on bg-soft-200 with their monogram and first name above a burst; yours on violet;
// Dibby on accent-lighter with its face and an AI tag; system lines centred and muted.

import { useEffect, type ReactNode } from "react";
import { Image, Text, View, type ViewProps } from "react-native";
import { Image as Motion } from "expo-image";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import type { MonogramColour } from "@dibs/shared/types";
import { tv } from "@/utils/tv";
import { DIBBY } from "./flow";
import { Monogram } from "./monogram";

// Dibby's face: the raised lime friend from the logo (packages/ui/assets/logos).
const DIBBY_FACE = require("@dibs/ui/assets/logos/export/dibby-ai-member-256.png");

const bubble = tv({
  slots: {
    row: "max-w-[85%] flex-row items-end gap-2",
    body: "rounded-lg px-3.5 py-2.5",
    text: "font-sans text-[16px] leading-[22px] text-text-strong-950",
    name: "mb-0.5 text-label-xs text-text-sub-600",
  },
  variants: {
    from: {
      them: { row: "self-start", body: "rounded-bl-[6px] bg-bg-soft-200" },
      me: { row: "flex-row-reverse self-end", body: "rounded-br-[6px] bg-primary-base", text: "text-static-white" },
      dibby: { row: "self-start", body: "rounded-bl-[6px] border-[1.5px] border-accent-light bg-accent-lighter" },
    },
  },
});

export function ChatThread({ className, ...rest }: ViewProps & { className?: string }) {
  return <View className={["gap-2", className].filter(Boolean).join(" ")} {...rest} />;
}

type MessageProps = {
  from: "me" | "them" | "dibby";
  children: ReactNode;
  /** Others: their name ("Sam B"): initials on the monogram, first name above the burst. */
  name?: string;
  colour?: MonogramColour;
  /** First message of a burst: shows the name (and, for others, the monogram). */
  first?: boolean;
  /** Under the bubble, beside the avatar (reactions), like the web's `.db-msg` column. */
  below?: ReactNode;
};

export function ChatMessage({ from, children, name, colour = "violet", first = true, below }: MessageProps) {
  const s = bubble({ from });
  const label = from === "dibby" ? "Dibby" : from === "them" ? name?.split(" ")[0] : undefined;
  return (
    <View className={s.row()}>
      {from === "them" ? (
        first && name ? <Monogram name={name} colour={colour} size={32} /> : <View className="size-8" />
      ) : from === "dibby" ? (
        first ? <Image source={DIBBY_FACE} accessibilityIgnoresInvertColors style={{ width: 32, height: 32, borderRadius: 16 }} /> : <View className="size-8" />
      ) : null}
      <View className="shrink">
        {first && label ? (
          <View className="flex-row items-center gap-1.5">
            <Text className={s.name()}>{label}</Text>
            {from === "dibby" ? (
              <View className="mb-0.5 rounded-full bg-accent-light px-1.5">
                <Text className="text-subheading-xs uppercase text-text-strong-950">AI</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View className={s.body()}>{typeof children === "string" ? <Text className={s.text()}>{children}</Text> : children}</View>
        {below}
      </View>
    </View>
  );
}

/**
 * Dibby working out a reply, the web's composer `.db-msg--ai` + `.typing`: Dibby thinking (the
 * think-loop clip, the still with Reduce Motion) beside a Dibby bubble, "Dibby's on it" and three
 * violet dots bouncing. Shown from the moment you send an @dibby message until the reply lands.
 */
export function DibbyTyping() {
  const reduce = useReducedMotion();
  const s = bubble({ from: "dibby" });
  return (
    <Animated.View
      entering={reduce ? undefined : FadeInDown.duration(220)}
      className={s.row()}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel="Dibby's on it"
    >
      {/* 48px like the web's xs Dibby, pulled in so it takes the 32px avatar's spot (`.composer__thinking`). */}
      <Motion source={reduce ? DIBBY.think : DIBBY.thinking} autoplay={!reduce} style={{ width: 48, height: 48, marginVertical: -8, marginLeft: -8 }} contentFit="contain" />
      <View className={s.body({ className: "flex-row items-center gap-1.5" })}>
        <Text className={s.text()}>Dibby&rsquo;s on it</Text>
        <View className="flex-row gap-[3px]" importantForAccessibility="no-hide-descendants">
          {[0, 1, 2].map((i) => (
            <TypingDot key={i} delay={i * 150} still={reduce} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

/** The web's `@keyframes dot`: up 4px and fully in at 40% of a 1s beat, resting faded the rest. */
function TypingDot({ delay, still }: { delay: number; still: boolean }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0, { duration: 400 }), withTiming(0, { duration: 200 })), -1));
  }, [delay, still, v]);
  const style = useAnimatedStyle(() => ({ opacity: still ? 0.8 : 0.4 + v.value * 0.6, transform: [{ translateY: -4 * v.value }] }));
  return <Animated.View className="size-1.5 rounded-full bg-primary-base" style={style} />;
}

/** "Mia set the place." Centred and muted. */
export function ChatSystem({ children }: { children: string }) {
  return <Text className="px-6 text-center text-paragraph-xs text-text-soft-400">{children}</Text>;
}

/** A timestamp between bursts: "Fri 6:42pm". */
export function ChatTime({ children }: { children: string }) {
  return <Text className="text-center text-paragraph-xs text-text-soft-400">{children}</Text>;
}
