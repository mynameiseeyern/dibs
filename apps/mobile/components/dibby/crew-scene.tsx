// Dibby and the group chat: Dibby waving in the middle of the screen, and a few messages from the
// crew floating in around him, the way a plan starts ("Fri 7pm?", "I'm in", "dumplings?"), then
// someone calls dibs. On the first start of the app they pop in one after another, then just bob.
// Tap one and it wiggles.
//
// Dibby is the native splash image (assets/splash-dibby.png) at the same size and place as the
// native splash, dead centre of the screen, so when the splash hides nothing moves: the messages
// just arrive around him. Used by the welcome screen, and briefly over your plans on start
// (app/index.tsx). Reduce Motion: everything's just there, still.
//
// Laid out with flex, not window maths: a full-screen column with Dibby between two equal spacers
// (so he's centred whatever size the screen reports), and the messages placed from his centre with
// transforms. An earlier version put him at left/top from useWindowDimensions, and on an iPhone
// he sat in the top-left corner with nothing around him (TestFlight build 4, Nov 2026).

import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { MonogramColour } from "@dibs/shared/types";
import { useShadow } from "@/lib/theme";
import { cn } from "@/utils/cn";
import { Monogram } from "./monogram";

const SPLASH = require("../../assets/splash-dibby.png");
/** The native splash's imageWidth (app.json): Dibby draws at exactly this, centred. */
export const SPLASH_SIZE = 200;
/** How far below the screen's centre Dibby's feet are, for laying things out under him. */
export const DIBBY_FEET = 68;

/**
 * The chat, in the order it pops in. `x` is the edge nearest Dibby and `y` the message's middle,
 * both in points from his centre: negative x sits to his left (right-aligned to x), positive to
 * his right. His body is about ±45 wide and ±67 tall in the 200pt image.
 */
type Line = { text: string; who?: { name: string; colour: MonogramColour }; x: number; y: number };
const CHAT: Line[] = [
  { text: "Fri 7pm?", who: { name: "Sam B", colour: "sky" }, x: -30, y: -118 },
  { text: "dumplings?", who: { name: "Mia K", colour: "sun" }, x: 30, y: -96 },
  { text: "I'm in", who: { name: "Jess L", colour: "mint" }, x: -52, y: 2 },
  // You, calling dibs: your own message, violet like yours in the chat. (Not lime: the welcome's
  // Make plans button is the lime moment on that screen.)
  { text: "dibs!", x: 56, y: 30 },
];

/** A message's box: wide enough for the longest, so one side can line up with Dibby. */
const BOX = 170;

/** Once per launch: the chat pops in the first time, and after that it's already here. */
let arrived = false;
export const crewArrived = () => arrived;

const POP_START = 160;
const POP_GAP = 230;
/** When the last message has landed. */
export const CREW_IN_MS = POP_START + CHAT.length * POP_GAP + 300;

/**
 * `hideDibby`: the hello moment (hello.tsx) has taken over drawing him, in the same place.
 * `focus`: everything but Dibby fades away (the chat and what's under him), for that moment.
 */
export function CrewScene({ hideDibby = false, focus = false, below }: { hideDibby?: boolean; focus?: boolean; below?: ReactNode }) {
  const reduce = useReducedMotion();
  const pop = !arrived && !reduce;
  const hop = useSharedValue(0);
  const fade = useSharedValue(1);
  const around = useSharedValue(1);

  useEffect(() => {
    // Once someone's called dibs, Dibby gives a little hop.
    if (pop) hop.value = withDelay(CREW_IN_MS - 200, withSequence(withTiming(-14, { duration: 160, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 220, easing: Easing.bounce })));
    const t = setTimeout(() => (arrived = true), CREW_IN_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Straight away: the hello moment draws the same image over him in the same frame.
    fade.value = hideDibby ? 0 : withTiming(1, { duration: 160 });
  }, [hideDibby, fade]);

  useEffect(() => {
    around.value = withTiming(focus ? 0 : 1, { duration: focus ? 280 : 200 });
  }, [focus, around]);
  const aroundStyle = useAnimatedStyle(() => ({ opacity: around.value }));

  const dibby = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: hop.value }] }));

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={{ flex: 1 }} />
      <View pointerEvents="box-none" style={{ height: SPLASH_SIZE, alignItems: "center", justifyContent: "center" }}>
        <Animated.View pointerEvents="none" style={[{ width: SPLASH_SIZE, height: SPLASH_SIZE }, dibby]}>
          <Image source={SPLASH} style={{ width: SPLASH_SIZE, height: SPLASH_SIZE }} contentFit="contain" accessible={false} />
        </Animated.View>
        {/* A point at Dibby's centre that the messages are placed from. */}
        <Animated.View pointerEvents="box-none" style={[{ position: "absolute", width: 0, height: 0, overflow: "visible" }, aroundStyle]}>
          {CHAT.map((line, i) => (
            <Message key={line.text} line={line} delay={POP_START + i * POP_GAP} pop={pop} still={reduce} seed={i} />
          ))}
        </Animated.View>
      </View>
      {/* The bottom half: whatever goes under him (the welcome's name and line), from his feet down. */}
      <Animated.View pointerEvents="box-none" style={[{ flex: 1 }, aroundStyle]}>
        {below ? <View pointerEvents="box-none" style={{ marginTop: DIBBY_FEET - SPLASH_SIZE / 2 + 16 }}>{below}</View> : null}
      </Animated.View>
    </View>
  );
}

function Message({ line, delay, pop, still, seed }: { line: Line; delay: number; pop: boolean; still: boolean; seed: number }) {
  const left = line.x < 0;
  const mine = !line.who;
  const shadow = useShadow("sm");
  const scale = useSharedValue(pop ? 0 : 1);
  const bob = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (pop) scale.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 190, mass: 0.8 }));
    if (still) return;
    // Each bobs at its own pace, so they never move in step.
    const period = 2400 + ((seed * 487) % 1100);
    bob.value = withDelay(pop ? delay + 400 : (seed * 230) % 900, withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amp = 3 + (seed % 2) * 2;
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, scale.value * 1.5),
    transform: [
      { translateY: (bob.value - 0.5) * 2 * amp + (1 - scale.value) * 10 },
      { rotate: `${wiggle.value * 5}deg` },
      { scale: 0.6 + scale.value * 0.4 },
    ],
  }));

  return (
    // The box's top-left is at Dibby's centre; the transform moves it out to its place, with the
    // message lined up on the side nearest him.
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: BOX,
        alignItems: left ? "flex-end" : "flex-start",
        transform: [{ translateX: left ? line.x - BOX : line.x }, { translateY: line.y - 18 }],
      }}
    >
      <Pressable
        accessible={false}
        onPress={() => {
          Haptics.selectionAsync();
          wiggle.value = withSequence(withTiming(1, { duration: 70 }), withTiming(-1, { duration: 110 }), withSpring(0, { damping: 6, stiffness: 300 }));
        }}
      >
        <Animated.View className="flex-row items-end gap-1.5" style={style}>
          {line.who ? <Monogram name={line.who.name} colour={line.who.colour} /> : null}
          <View
            className={cn("rounded-lg px-2.5 py-1.5", mine ? "rounded-br-[6px] bg-primary-base" : "rounded-bl-[6px] border border-stroke-soft-200 bg-bg-white-0")}
            style={shadow}
          >
            <Text className={cn("text-label-sm", mine ? "text-static-white" : "text-text-strong-950")}>{line.text}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
