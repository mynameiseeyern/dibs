// Making a plan, one question a screen, paced like someone talking rather than a form or a chat log.
// Dibby hops along the hopscotch (hopscotch.tsx) and reads each question out: it's the screen's
// heading, coming in word by word as he talks. Then the answers ease in. Reduce Motion and screen
// readers get it all at once, no waiting.
//
// <DibbyAsks stepKey="what" question="What are we doing?" ack="Love that." />
// <Answers stepKey="what">{chips…}</Answers>   (eases in after the question has landed)

import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { AccessibilityInfo, Platform, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/utils/cn";
import { Icon, type IconName } from "@/components/ui/icon";

/** How long Dibby "thinks" before asking, and how the rest follows. Zero with Reduce Motion. */
// `think` covers Dibby's hop to the next square (HOP_MS in hopscotch.tsx) plus a beat once he's landed;
// then he reads the question out.
export const PACE = { think: 900, question: 380, hint: 140, answers: 260, stagger: 50 };

/** The beat timings for this person: real ones, or none at all with Reduce Motion on. */
export function usePace() {
  const reduce = useReducedMotion();
  return reduce ? { think: 0, question: 0, hint: 0, answers: 0, stagger: 0, reduce } : { ...PACE, reduce };
}

/** True once `ms` has passed (straight away when it's 0). Starts again when `key` changes. */
export function useAfter(ms: number, key: string) {
  const [doneFor, setDoneFor] = useState<string | null>(ms === 0 ? key : null);
  useEffect(() => {
    if (ms === 0) return;
    const t = setTimeout(() => setDoneFor(key), ms);
    return () => clearTimeout(t);
  }, [ms, key]);
  return ms === 0 || doneFor === key;
}

/** Dibby's poses (stills from the character library, apps/web/public/dibby). One per question. */
export const DIBBY = {
  face: require("../../assets/dibby/face.png"),
  wave: require("../../assets/dibby/wave.png"),
  hi: require("../../assets/dibby/hi.png"),
  think: require("../../assets/dibby/think.png"),
  phone: require("../../assets/dibby/phone.png"),
  point: require("../../assets/dibby/point.png"),
  look: require("../../assets/dibby/look.png"),
  thumbs: require("../../assets/dibby/thumbs.png"),
  shrug: require("../../assets/dibby/shrug.png"),
  /** Loops: only while loading, and the cheer when a plan's made. */
  thinking: require("../../assets/dibby/think-loop.webp"),
  cheer: require("../../assets/dibby/cheer.webp"),
};
export type Pose = keyof typeof DIBBY;

/** Three dots, breathing: Dibby's working out what to say. */
export function Thinking({ className }: { className?: string }) {
  return (
    <View className={cn("h-8 flex-row items-center gap-1.5", className)} accessibilityLabel="Dibby's thinking" accessibilityRole="progressbar">
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 140} />
      ))}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0.3, { duration: 320 })), -1));
  }, [delay, v]);
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 2 }] }));
  return <Animated.View className="h-2 w-2 rounded-full bg-text-soft-400" style={style} />;
}

/** Words a second while Dibby reads a question out. */
export const WORD_MS = 110;

/** How long Dibby talks for a line (the talking bob in hopscotch.tsx matches it). */
export const talkMs = (text: string) => text.trim().split(/\s+/).length * WORD_MS + 200;

/** Whether VoiceOver / TalkBack is on: then nothing waits or reveals, it's all just there. */
export function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    // react-native-web always says yes, so the web preview would never move; the app is phones only.
    if (Platform.OS === "web") return;
    AccessibilityInfo.isScreenReaderEnabled().then(setOn);
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/**
 * The question, as the screen's heading, read out by Dibby: once he's hopped and landed, the words
 * come in one by one in time with him talking. `ack` is a short reply to the last answer ("Dinner,
 * love that."), so it reads like a conversation. Screen readers get the whole heading at once, with
 * focus moved to it on each new question; Reduce Motion shows it straight away.
 */
export function DibbyAsks({ stepKey, question, hint, ack }: { stepKey: string; question: string; hint?: string; ack?: string | null }) {
  const pace = usePace();
  const reader = useScreenReader();
  const still = pace.reduce || reader;
  const asked = useAfter(still ? 0 : pace.think, stepKey);
  const heading = useRef<ComponentRef<typeof View>>(null);
  const words = question.split(" ");

  useEffect(() => {
    if (!asked) return;
    if (!still) Haptics.selectionAsync();
    // A screen reader lands on the new question, rather than staying on the button just tapped.
    const t = setTimeout(() => {
      if (Platform.OS !== "web" && heading.current) AccessibilityInfo.sendAccessibilityEvent(heading.current, "focus");
    }, 100);
    return () => clearTimeout(t);
  }, [asked, still]);

  return (
    <View className="min-h-24 gap-1">
      {ack ? (
        <Animated.Text key={`ack-${stepKey}`} entering={still ? undefined : FadeIn.duration(240)} className="text-paragraph-lg text-text-sub-600">
          {ack}
        </Animated.Text>
      ) : null}
      <View ref={heading} accessible accessibilityRole="header" accessibilityLabel={question} className="min-h-10 flex-row flex-wrap">
        {!asked ? (
          <Thinking />
        ) : still ? (
          <Text className="font-display text-title-h3 text-text-strong-950">{question}</Text>
        ) : (
          words.map((w, i) => (
            <Animated.Text
              key={`${stepKey}-${i}`}
              entering={FadeInDown.duration(200).delay(i * WORD_MS)}
              importantForAccessibility="no"
              className="font-display text-title-h3 text-text-strong-950"
            >
              {i < words.length - 1 ? `${w} ` : w}
            </Animated.Text>
          ))
        )}
      </View>
      {asked && hint ? (
        <Animated.Text key={`h-${stepKey}`} entering={still ? undefined : FadeIn.duration(260).delay(words.length * WORD_MS)} className="text-paragraph-md text-text-sub-600">
          {hint}
        </Animated.Text>
      ) : null}
    </View>
  );
}

/** The answers for a question: hidden while Dibby hops and reads it out (`after`: the reading, from talkMs), then easing up. */
export function Answers({ stepKey, children, className, after = 0 }: { stepKey: string; children: ReactNode; className?: string; after?: number }) {
  const pace = usePace();
  const reader = useScreenReader();
  const ready = useAfter(pace.reduce || reader ? 0 : pace.think + Math.min(after, 900) + pace.answers, stepKey);
  if (!ready) return null;
  return (
    <Animated.View key={`a-${stepKey}`} entering={pace.reduce ? undefined : FadeInDown.duration(320)} className={cn("gap-3", className)}>
      {children}
    </Animated.View>
  );
}

/** One item in a staggered group (chips, choices): eases in `index` beats after the group. */
export function Stagger({ index, children }: { index: number; children: ReactNode }) {
  const pace = usePace();
  return <Animated.View entering={pace.reduce ? undefined : FadeIn.duration(220).delay(index * pace.stagger)}>{children}</Animated.View>;
}

/** A tappable answer pill, 44px tall. Selected: violet. */
export function Choice({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      className={cn(
        "min-h-11 flex-row items-center gap-1.5 rounded-full border px-4",
        selected ? "border-primary-base bg-primary-base" : "border-stroke-soft-200 bg-bg-white-0 active:bg-bg-weak-50"
      )}
    >
      {icon ? <Icon name={icon} className={cn("text-[18px] leading-[18px]", selected ? "text-static-white" : "text-text-sub-600")} /> : null}
      <Text className={cn("text-label-md", selected ? "text-static-white" : "text-text-strong-950")}>{label}</Text>
    </Pressable>
  );
}

/** A big choice card: an icon (or Dibby's face), a title and a line under it. */
export function Option({
  title,
  body,
  icon,
  dibby,
  selected,
  onPress,
}: {
  title: string;
  body: string;
  icon?: IconName;
  dibby?: boolean;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: Boolean(selected) }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      className={cn(
        "min-h-16 flex-row items-center gap-3 rounded-lg border p-3",
        selected ? "border-primary-base bg-primary-lighter" : "border-stroke-soft-200 bg-bg-white-0 active:bg-bg-weak-50"
      )}
    >
      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-bg-weak-50">
        {dibby ? (
          <Image source={DIBBY.face} style={{ width: 48, height: 48 }} contentFit="cover" accessible={false} />
        ) : icon ? (
          <Icon name={icon} className="text-[22px] leading-[22px] text-primary-base" />
        ) : null}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-label-lg text-text-strong-950">{title}</Text>
        <Text className="text-paragraph-sm text-text-sub-600">{body}</Text>
      </View>
    </Pressable>
  );
}
