// Making a plan as hopscotch: each question is a chalk square, and the squares are the progress.
// Dibby goes through three phases on every square:
//
//   1. hop   — travels from the last square to this one (a transition)
//   2. talk  — reads the question out: it's the heading underneath, coming in word by word
//   3. rest  — a resting loop while you answer (blinking, swaying left to right)
//
// Each phase plays a Runway clip when there is one (transparent animated WebP in assets/dibby),
// and a stand-in made in code until then. To add a clip, put it in CLIPS: the code stand-in for
// that phase switches itself off (the hop keeps its sideways travel, since the clip hops in place).
//
// Pose per square (app/new.tsx): what → thinking, when → on his phone, where → pointing (looking
// around when Dibby's finding spots), who → saying hi.

import { useEffect, useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { Image, type ImageSource } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/utils/cn";
import { Icon } from "@/components/ui/icon";
import { DIBBY, PACE, usePace, WORD_MS, type Pose } from "./flow";

type Clip = number | ImageSource;

/** Runway clips, once they exist. Leave a phase out and the code stand-in plays. */
const CLIPS: {
  /** Hopping from one square to the next, in place (the app moves him across). */
  hop?: Clip;
  /** Mouth moving, per pose. */
  talk: Partial<Record<Pose, Clip>>;
  /** The resting loop, per pose: blinks, a sway. */
  rest: Partial<Record<Pose, Clip>>;
} = { talk: {}, rest: {} };

/** How the code stand-in rests: swaying side to side, or breathing. */
export type Rest = "sway" | "breathe";

export type Phase = "hop" | "talk" | "rest";

export const DIBBY_SIZE = 112;
const TRACK = 44;
const GUTTER = 16;
/** Dibby's feet sit this far down into the square. */
const FEET = 14;
/** One hop, take-off to landing. */
export const HOP_MS = 520;

/** Where Dibby stands on square `index` of `count` (also where the hello moment lands him). */
export function squareX(width: number, count: number, index: number) {
  const sq = (width - GUTTER * 2) / count;
  return GUTTER + sq * index + sq / 2 - DIBBY_SIZE / 2;
}

/** Height of the hopscotch area: Dibby standing, and the squares under his feet. */
export const AREA_HEIGHT = DIBBY_SIZE - FEET + TRACK;

/** A square: the question's word, or once answered, the answer (tap it to hop back). */
export type Square = { key: string; label: string; onPress?: () => void };

export function Hopscotch({ squares, at, pose, rest, talk = 0 }: { squares: Square[]; at: number; pose: Pose; rest: Rest; talk?: number }) {
  const { width } = useWindowDimensions();
  const pace = usePace();
  const count = squares.length;
  const [phase, setPhase] = useState<Phase>("rest");
  const x = useSharedValue(squareX(width, count, at));
  const lift = useSharedValue(0);
  const squash = useSharedValue(0);
  const sway = useSharedValue(0);
  const breathe = useSharedValue(0);
  const chat = useSharedValue(0);
  const first = useRef(true);
  // No crossfade for the first pose: he's just landed from the hello moment, so no blink.
  const [fade, setFade] = useState(0);

  useEffect(() => {
    const to = squareX(width, count, at);
    const arrived = first.current;
    first.current = false;

    // Stop resting while he moves.
    cancelAnimation(sway);
    cancelAnimation(breathe);
    sway.value = withTiming(0, { duration: 120 });
    breathe.value = withTiming(0, { duration: 120 });

    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    if (pace.reduce) {
      x.value = to;
      after(0, () => setPhase("rest"));
      return () => timers.forEach(clearTimeout);
    }
    if (!arrived) after(0, () => setFade(160));

    // 1 · hop. The first square has no hop: he's already there (the hello moment lands him).
    const hopMs = arrived ? 0 : HOP_MS;
    if (hopMs) {
      after(0, () => setPhase("hop"));
      x.value = withTiming(to, { duration: HOP_MS, easing: Easing.inOut(Easing.quad) });
      if (!CLIPS.hop) {
        lift.value = withSequence(withTiming(-48, { duration: HOP_MS / 2, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: HOP_MS / 2, easing: Easing.in(Easing.quad) }));
        squash.value = withDelay(HOP_MS, withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 200, easing: Easing.out(Easing.back(2)) })));
      }
      after(HOP_MS, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    } else {
      x.value = to;
    }

    // 2 · talk, in time with the heading coming in (DibbyAsks starts at PACE.think).
    const talkAt = PACE.think;
    if (talk > 0) {
      after(talkAt, () => setPhase("talk"));
      if (!CLIPS.talk[pose]) {
        const words = Math.max(1, Math.round((talk - 200) / WORD_MS));
        chat.value = withDelay(talkAt, withRepeat(withSequence(withTiming(1, { duration: WORD_MS / 2 }), withTiming(0, { duration: WORD_MS / 2 })), words));
      }
    }

    // 3 · rest, looping till the next answer.
    const restAt = talk > 0 ? talkAt + talk : Math.max(hopMs, 300);
    after(restAt, () => {
      setPhase("rest");
      if (CLIPS.rest[pose]) return;
      if (rest === "sway") {
        sway.value = withRepeat(withSequence(withTiming(4, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(-4, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1, true);
      } else {
        breathe.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true);
      }
    });

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, count, width, pose, rest, talk, pace.reduce]);

  const dibbyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: lift.value - breathe.value * 3 },
      { scaleX: 1 + squash.value * 0.08 },
      { scaleY: 1 - squash.value * 0.1 + chat.value * 0.025 + breathe.value * 0.015 },
      { rotate: `${sway.value}deg` },
    ],
  }));

  const clip = phase === "hop" ? CLIPS.hop : phase === "talk" ? CLIPS.talk[pose] : CLIPS.rest[pose];
  const sq = (width - GUTTER * 2) / count;

  return (
    <View style={{ height: AREA_HEIGHT }} accessibilityLabel={`Question ${at + 1} of ${count}`}>
      {/* The chalk squares */}
      <View className="absolute flex-row" style={{ left: GUTTER, right: GUTTER, bottom: 0, height: TRACK }}>
        {squares.map((s, i) => (
          <Pressable
            key={s.key}
            style={{ width: sq }}
            className="px-1"
            disabled={i >= at || !s.onPress}
            onPress={s.onPress}
            accessibilityRole={i < at ? "button" : undefined}
            accessibilityLabel={i < at ? `${s.label}, change it` : s.label}
          >
            <View
              className={cn(
                "h-full flex-row items-center justify-center gap-1 rounded-sm border-2 border-dashed px-1.5",
                i < at ? "border-primary-base bg-primary-lighter active:opacity-70" : i === at ? "border-primary-base bg-bg-white-0" : "border-stroke-soft-200 bg-bg-white-0"
              )}
            >
              {i < at ? <Icon name="check-line" className="text-[14px] leading-[14px] text-primary-base" /> : null}
              <Text numberOfLines={1} className={cn("shrink text-label-sm", i <= at ? "text-primary-dark" : "text-text-soft-400")}>
                {s.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Dibby, on the current square */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 0, top: 0, width: DIBBY_SIZE, height: DIBBY_SIZE, transformOrigin: "50% 100%" }, dibbyStyle]}
      >
        <Image source={clip ?? DIBBY[pose]} style={{ width: DIBBY_SIZE, height: DIBBY_SIZE }} contentFit="contain" transition={fade} accessible={false} />
      </Animated.View>
    </View>
  );
}
