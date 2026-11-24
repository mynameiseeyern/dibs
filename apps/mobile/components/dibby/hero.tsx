// Making a plan, Dibby asks: he stands centred at the top of each screen with the question in a
// speech bubble under him (the screen's heading). On to the next question, he jumps on the spot
// (crouch, up, land, settle) and lands in the next pose, and the bubble swaps its words while
// he's in the air. While you answer he only breathes.
//
// Smooth on purpose: the jump is drawn in code on the UI thread, and every pose is a still that's
// already mounted, so landing on a new one is just a switch. Reduce Motion: no jump or breathing,
// the words just change.
//
// <DibbyHero pose="think" question="What are we doing?" size={112} />
// <StepBar count={3} at={0} />

import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { cn } from "@/utils/cn";
import { DIBBY, type Pose } from "./flow";

/** Where Dibby stands, under the top bar: the hello moment (hello.tsx) lands him here. */
export const HERO_TOP = 64;
/** His size on the first question, which is where the hello moment lands him. */
export const HERO_SIZE = 112;

const CROUCH_MS = 110;
const AIR_MS = 360;
const SETTLE_MS = 240;
const JUMP = 30;

const POSES: Pose[] = ["think", "phone", "point", "look", "hi"];

export function DibbyHero({ pose, question, size = HERO_SIZE }: { pose: Pose; question: string; size?: number }) {
  const reduce = useReducedMotion();
  const lift = useSharedValue(0);
  const squash = useSharedValue(0);
  const breathe = useSharedValue(0);
  const words = useSharedValue(1);
  const box = useSharedValue(size);
  const [shown, setShown] = useState<Pose>(pose);
  const [said, setSaid] = useState(question);
  const first = useRef(true);

  useEffect(() => {
    const rest = () => (breathe.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
    if (first.current || reduce) {
      first.current = false;
      setShown(pose);
      setSaid(question);
      box.value = size;
      if (!reduce) rest();
      return;
    }
    cancelAnimation(breathe);
    breathe.value = withTiming(0, { duration: 100 });
    const apex = CROUCH_MS + AIR_MS / 2;
    const land = CROUCH_MS + AIR_MS;
    // Crouch (squash), take off (stretch), round in the air, squash on landing, settle.
    squash.value = withSequence(
      withTiming(0.6, { duration: CROUCH_MS, easing: Easing.out(Easing.quad) }),
      withTiming(-0.5, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: AIR_MS - 90, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.5, { duration: 70, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: SETTLE_MS, easing: Easing.out(Easing.back(2)) })
    );
    lift.value = withDelay(
      CROUCH_MS,
      withSequence(withTiming(-JUMP, { duration: AIR_MS / 2, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: AIR_MS / 2, easing: Easing.in(Easing.quad) }))
    );
    // A different size on some questions: he grows or shrinks while he's up.
    box.value = withDelay(CROUCH_MS, withTiming(size, { duration: AIR_MS, easing: Easing.inOut(Easing.quad) }));
    // The bubble goes quiet as he jumps and says the new question as he lands.
    words.value = withSequence(withTiming(0, { duration: CROUCH_MS + 60 }), withDelay(AIR_MS - 60, withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })));
    breathe.value = withDelay(land + SETTLE_MS, withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
    const timers = [
      setTimeout(() => {
        setShown(pose);
        setSaid(question);
      }, apex),
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), land),
    ];
    return () => timers.forEach(clearTimeout);
  }, [pose, question, size, reduce, lift, squash, breathe, words, box]);

  const frame = useAnimatedStyle(() => ({ width: box.value, height: box.value }));
  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scaleX: 1 + squash.value * 0.1 - breathe.value * 0.01 }, { scaleY: 1 - squash.value * 0.12 + breathe.value * 0.025 }],
  }));
  const shadow = useAnimatedStyle(() => {
    const up = -lift.value / JUMP;
    return { opacity: 0.3 - up * 0.18, transform: [{ scaleX: 1 - up * 0.4 }] };
  });
  const bubble = useAnimatedStyle(() => ({ opacity: words.value, transform: [{ translateY: (1 - words.value) * 6 }, { scale: 0.97 + words.value * 0.03 }] }));

  return (
    <View className="items-center">
      <Animated.View style={frame}>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: "25%", right: "25%", bottom: 2, height: 8, borderRadius: 999 }, shadow]} className="bg-static-black" />
        <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, transformOrigin: "50% 100%" }, body]}>
          {/* Every pose mounted (so it's loaded), one showing, pinned on top of each other. */}
          {POSES.map((p) => (
            <View key={p} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: p === shown ? 1 : 0 }}>
              <Image source={DIBBY[p]} style={{ width: "100%", height: "100%" }} contentFit="contain" accessible={false} />
            </View>
          ))}
        </Animated.View>
      </Animated.View>

      <Animated.View style={bubble} className="mt-3 items-center">
        {/* The tail, pointing up at him. */}
        <View className="-mb-2 h-4 w-4 rotate-45 rounded-[3px] bg-bg-weak-50" />
        <View className="rounded-xl bg-bg-weak-50 px-5 py-3">
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" className="text-center font-title text-[26px] leading-[32px] text-text-strong-950">
            {said}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

/** How far through you are: a slim bar in segments. */
export function StepBar({ count, at }: { count: number; at: number }) {
  return (
    <View className="flex-1 flex-row gap-1.5" accessible accessibilityLabel={`Step ${at + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className={cn("h-1.5 flex-1 rounded-full", i <= at ? "bg-primary-base" : "bg-bg-soft-200")} />
      ))}
    </View>
  );
}
