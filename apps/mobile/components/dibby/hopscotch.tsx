// Making a plan as hopscotch, kept small: the squares are the progress bar at the top of the
// screen, and Dibby stands on the one you're up to. Answer, and he hops a square forward (back,
// and he hops back). Tap a square you've done to go back to it.
//
// Smooth on purpose: the hop is drawn in code on the UI thread (crouch, arc, land, settle), and
// every pose is a still that's already loaded and stacked, so landing on a new pose is just an
// opacity switch with nothing to decode. While you answer he only breathes. Reduce Motion: he
// moves without hopping or breathing.
//
// The Runway clips (assets/dibby/motion) aren't played here: decoding a new 500KB clip on every
// hop and every phase is what made the old version stutter.

import { useEffect, useRef, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { cn } from "@/utils/cn";
import { Icon } from "@/components/ui/icon";
import { DIBBY, type Pose } from "./flow";

/** Dibby on his square. Also where the hello moment (hello.tsx) shrinks him to as he lands. */
export const DIBBY_SIZE = 64;
const TRACK = 28;
const GUTTER = 16;
/** Dibby's feet sit this far down into the square. */
const FEET = 8;
/** Crouch, then the hop itself (take-off to landing), then the settle. */
const CROUCH_MS = 110;
export const HOP_MS = 380;
const SETTLE_MS = 240;
const HOP_HEIGHT = 26;

/** The poses he can land in; all mounted at once so switching is instant. */
const POSES: Pose[] = ["think", "phone", "point", "look", "hi"];

/** Where Dibby stands on square `index` of `count` (also where the hello moment lands him). */
export function squareX(width: number, count: number, index: number) {
  const sq = (width - GUTTER * 2) / count;
  return GUTTER + sq * index + sq / 2 - DIBBY_SIZE / 2;
}

/** Height of the hopscotch area: Dibby standing, and the squares under his feet. */
export const AREA_HEIGHT = DIBBY_SIZE - FEET + TRACK;

/** A square: the question's word ("When"); tap a done one to go back to it. */
export type Square = { key: string; label: string; onPress?: () => void };

export function Hopscotch({ squares, at, pose }: { squares: Square[]; at: number; pose: Pose }) {
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const count = squares.length;
  const x = useSharedValue(squareX(width, count, at));
  const lift = useSharedValue(0);
  const squash = useSharedValue(0);
  const breathe = useSharedValue(0);
  /** Which pose shows: switched when he lands, so he takes off as one pose and lands as the next. */
  const [shown, setShown] = useState<Pose>(pose);
  const first = useRef(true);

  useEffect(() => {
    const to = squareX(width, count, at);
    if (first.current || reduce) {
      first.current = false;
      x.value = to;
      setShown(pose);
      if (!reduce) breathe.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
      return;
    }
    cancelAnimation(breathe);
    breathe.value = withTiming(0, { duration: 100 });
    const land = CROUCH_MS + HOP_MS;
    // Squash to crouch, stretch on take-off, round in the air, squash on landing, settle.
    squash.value = withSequence(
      withTiming(0.6, { duration: CROUCH_MS, easing: Easing.out(Easing.quad) }),
      withTiming(-0.5, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: HOP_MS - 90, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.5, { duration: 70, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: SETTLE_MS, easing: Easing.out(Easing.back(2)) })
    );
    lift.value = withDelay(
      CROUCH_MS,
      withSequence(withTiming(-HOP_HEIGHT, { duration: HOP_MS / 2, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: HOP_MS / 2, easing: Easing.in(Easing.quad) }))
    );
    x.value = withDelay(CROUCH_MS, withTiming(to, { duration: HOP_MS, easing: Easing.inOut(Easing.sin) }));
    breathe.value = withDelay(land + SETTLE_MS, withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
    const t = setTimeout(() => {
      setShown(pose);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, land);
    return () => clearTimeout(t);
  }, [at, count, width, pose, reduce, x, lift, squash, breathe]);

  // Squash > 0 is squashed, < 0 stretched; he scales from his feet.
  const dibbyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: lift.value },
      { scaleX: 1 + squash.value * 0.1 - breathe.value * 0.01 },
      { scaleY: 1 - squash.value * 0.12 + breathe.value * 0.025 },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => {
    const up = -lift.value / HOP_HEIGHT;
    return { opacity: 0.35 - up * 0.2, transform: [{ translateX: x.value + DIBBY_SIZE / 2 - SHADOW_W / 2 }, { scaleX: 1 - up * 0.4 }] };
  });

  const sq = (width - GUTTER * 2) / count;
  return (
    <View style={{ height: AREA_HEIGHT }} accessibilityLabel={`Step ${at + 1} of ${count}`}>
      <View className="absolute flex-row" style={{ left: GUTTER, right: GUTTER, bottom: 0, height: TRACK }}>
        {squares.map((s, i) => {
          const done = i < at;
          return (
            <Pressable
              key={s.key}
              style={{ width: sq }}
              className="px-1"
              disabled={!done || !s.onPress}
              onPress={s.onPress}
              accessibilityRole={done ? "button" : undefined}
              accessibilityLabel={done ? `${s.label}, change it` : s.label}
            >
              <View
                className={cn(
                  "h-full flex-row items-center justify-center gap-1 rounded-sm border-[1.5px] border-dashed",
                  done ? "border-primary-base bg-primary-lighter active:opacity-70" : i === at ? "border-primary-base bg-bg-white-0" : "border-stroke-soft-200 bg-bg-white-0"
                )}
              >
                {done ? <Icon name="check-line" className="text-[12px] leading-[12px] text-primary-base" /> : null}
                <Text numberOfLines={1} className={cn("text-label-xs", i <= at ? "text-primary-dark" : "text-text-soft-400")}>
                  {s.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 0, top: DIBBY_SIZE - 10, width: SHADOW_W, height: 6, borderRadius: 999 }, shadowStyle]}
        className="bg-static-black"
      />

      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: DIBBY_SIZE, height: DIBBY_SIZE, transformOrigin: "50% 100%" }, dibbyStyle]}>
        {/* Every pose mounted (so it's loaded), one showing. Explicitly pinned on top of each other. */}
        {POSES.map((p) => (
          <View key={p} style={{ position: "absolute", top: 0, left: 0, width: DIBBY_SIZE, height: DIBBY_SIZE, opacity: p === shown ? 1 : 0 }}>
            <Image source={DIBBY[p]} style={{ width: DIBBY_SIZE, height: DIBBY_SIZE }} contentFit="contain" accessible={false} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const SHADOW_W = 34;
