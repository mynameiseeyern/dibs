// The moment someone taps "Make plans": the screen dims, Dibby climbs out from behind the button,
// waves and says hi, then hops up onto the first hopscotch square, where the questions start
// (app/new.tsx). Skip, top right, goes straight to the first question. With Reduce Motion or a
// screen reader on there's no moment at all.
//
// The motion is code for now, on the waving still. When the Runway clip is ready (Dibby climbing
// out and waving, transparent, as an animated WebP), set HELLO_CLIP to it and keep the rest.

import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { DIBBY, useScreenReader } from "./flow";
import { DIBBY_SIZE, squareX } from "./hopscotch";
import { useColour, useShadow } from "@/lib/theme";

/** Swap for the Runway clip when it exists. */
const HELLO_CLIP = DIBBY.wave;

const SIZE = 176;
/** The hopscotch's top on the form: under its 8px gap and 48px top bar (app/new.tsx). */
const HOPSCOTCH_TOP = 56;

const T = { scrim: 260, rise: 220, wave: 760, say: 900, leave: 2700, fly: 420 };

export type Anchor = { x: number; y: number; width: number; height: number };

export function DibbyHello({
  anchor,
  label,
  squares,
  onDone,
}: {
  /** How many squares the form will have, so he lands on the first one. */
  squares: number;
  /** The button's place on screen (measureInWindow), so Dibby comes out from behind it. */
  anchor: Anchor | null;
  /** The button's text, drawn again over Dibby so it hides him till he climbs out. */
  label: string;
  onDone: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const reader = useScreenReader();
  const reduce = reducedMotion || reader;
  const pop = useShadow("pop");
  const dim = useColour("overlay");
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  const scrim = useSharedValue(0);
  const rise = useSharedValue(SIZE);
  const tilt = useSharedValue(0);
  const say = useSharedValue(0);
  const fly = useSharedValue(0);

  useEffect(() => {
    if (!anchor) return;
    if (reduce) return finish();
    scrim.value = withTiming(1, { duration: T.scrim });
    rise.value = withDelay(T.rise, withSpring(0, { damping: 13, stiffness: 140, mass: 0.9 }));
    tilt.value = withDelay(
      T.wave,
      withSequence(
        withTiming(-7, { duration: 140 }),
        withTiming(7, { duration: 180 }),
        withTiming(-5, { duration: 160 }),
        withTiming(4, { duration: 150 }),
        withTiming(0, { duration: 140 })
      )
    );
    say.value = withDelay(T.say, withTiming(1, { duration: 260 }));
    const timers = [
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), T.rise + 160),
      setTimeout(() => Haptics.selectionAsync(), T.wave + 140),
      setTimeout(() => {
        say.value = withTiming(0, { duration: 160 });
        scrim.value = withTiming(0, { duration: T.fly });
        fly.value = withTiming(1, { duration: T.fly, easing: Easing.inOut(Easing.cubic) });
      }, T.leave),
      setTimeout(finish, T.leave + T.fly),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, reduce]);

  // Dibby stands on the button's middle; the window he's in ends there, so he's hidden till he rises.
  const floor = anchor ? anchor.y + anchor.height / 2 : 0;
  const startLeft = width / 2 - SIZE / 2;
  const startTop = floor - SIZE;
  const landTop = insets.top + HOPSCOTCH_TOP;
  const landLeft = squareX(width, squares, 0);
  const scale = DIBBY_SIZE / SIZE;

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const sayStyle = useAnimatedStyle(() => ({ opacity: say.value, transform: [{ translateY: (1 - say.value) * 8 }] }));
  const dibbyStyle = useAnimatedStyle(() => {
    // Hopping up onto the first square, shrinking on the way. He scales from his feet, so line up feet.
    const dx = (landLeft + DIBBY_SIZE / 2 - (startLeft + SIZE / 2)) * fly.value;
    const dy = (landTop + DIBBY_SIZE - (startTop + SIZE)) * fly.value - Math.sin(fly.value * Math.PI) * 60;
    const s = 1 + (scale - 1) * fly.value;
    return { transform: [{ translateX: dx }, { translateY: dy + rise.value * (1 - fly.value) }, { scale: s }, { rotate: `${tilt.value}deg` }] };
  });
  // Once he's flying, the window no longer clips him.
  const windowStyle = useAnimatedStyle(() => ({ overflow: fly.value > 0 ? "visible" : "hidden" }));
  const buttonStyle = useAnimatedStyle(() => ({ opacity: 1 - fly.value }));

  if (!anchor || reduce) return null;

  return (
    // A layer over the welcome screen (it has no header, so it covers everything), not a Modal:
    // the same on iOS, Android and the web preview, and the theme's colours reach it.
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityViewIsModal>
      <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, { backgroundColor: dim }, scrimStyle]} />

      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: 0, height: floor }, windowStyle]}>
        <Animated.View style={[{ position: "absolute", left: startLeft, top: startTop, width: SIZE, height: SIZE, transformOrigin: "50% 100%" }, dibbyStyle]}>
          <Image source={HELLO_CLIP} style={{ width: SIZE, height: SIZE }} contentFit="contain" accessible={false} />
        </Animated.View>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 16, right: 16, top: Math.max(insets.top + 56, startTop - 96) }, sayStyle]}
        className="items-center"
      >
        <View className="rounded-lg bg-bg-white-0 px-5 py-3">
          <Text accessibilityLiveRegion="polite" className="text-center font-display text-title-h4 text-text-strong-950">
            Hey, I&rsquo;m Dibby!
          </Text>
          <Text className="text-center text-paragraph-md text-text-sub-600">Let&rsquo;s get this plan locked in.</Text>
        </View>
      </Animated.View>

      {/* The button again, over Dibby, so he climbs out from behind it. Same look as Button.Root variant="dibs". */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: anchor.x, top: anchor.y, width: anchor.width, height: anchor.height }, pop, buttonStyle]}
        className="items-center justify-center rounded-full border-2 border-static-black bg-accent-base"
      >
        <Text className="text-label-lg text-static-black">{label}</Text>
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip"
        hitSlop={12}
        onPress={finish}
        style={{ position: "absolute", top: insets.top + 8, right: 16 }}
        className="min-h-11 justify-center rounded-full bg-bg-white-0/90 px-4"
      >
        <Text className="text-label-md text-text-strong-950">Skip</Text>
      </Pressable>
    </View>
  );
}
