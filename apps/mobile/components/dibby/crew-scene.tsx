// Dibby and the crew: Dibby waving in the middle of the screen, and his crew (blobs in the crew
// colours, each with a pair of eyes looking his way) in a loose ring around him, a few half off
// the edges. On the first start of the app they pop in one after another, then just bob about.
// Tap one and it boings.
//
// Dibby is the native splash image (assets/splash-dibby.png) at the same size and place as the
// native splash, dead centre of the screen, so when the splash hides nothing moves: the crew just
// arrive around him. Used by the welcome screen, and briefly over your plans on start (app/index.tsx).
// Reduce Motion: everyone's just there, still.

import { useEffect } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
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
import { useColour } from "@/lib/theme";

type ColourName = Parameters<typeof useColour>[0];

const SPLASH = require("../../assets/splash-dibby.png");
/** The native splash's imageWidth (app.json): Dibby draws at exactly this, centred. */
export const SPLASH_SIZE = 200;
/** How far below the screen's centre Dibby's feet are, for laying things out under him. */
export const DIBBY_FEET = 68;

type Shape = "circle" | "squircle" | "egg";
/** Where each one sits, as a fraction of the screen, clear of Dibby, the title under him and the buttons. */
const CREW: { colour: ColourName; x: number; y: number; size: number; shape: Shape }[] = [
  { colour: "crew-mint", x: 0.2, y: 0.2, size: 68, shape: "squircle" },
  { colour: "crew-rose", x: 0.52, y: 0.13, size: 50, shape: "circle" },
  { colour: "crew-sky", x: 0.8, y: 0.19, size: 58, shape: "egg" },
  { colour: "crew-violet", x: 0.04, y: 0.42, size: 56, shape: "egg" },
  { colour: "crew-coral", x: 0.98, y: 0.44, size: 66, shape: "circle" },
  { colour: "crew-sun", x: 0.07, y: 0.62, size: 64, shape: "circle" },
  { colour: "crew-aqua", x: 0.92, y: 0.62, size: 56, shape: "squircle" },
  { colour: "crew-tangerine", x: 0.3, y: 0.31, size: 40, shape: "circle" },
];

/** Once per launch: the crew pops in the first time, and after that they're already here. */
let arrived = false;
export const crewArrived = () => arrived;

const POP_START = 120;
const POP_GAP = 85;
/** When the last of the crew has landed. */
export const CREW_IN_MS = POP_START + CREW.length * POP_GAP + 350;

export function CrewScene({ hideDibby = false }: { hideDibby?: boolean }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const pop = !arrived && !reduce;
  const hop = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    // Once they've all arrived, Dibby gives a little hop hello.
    if (pop) hop.value = withDelay(CREW_IN_MS - 150, withSequence(withTiming(-14, { duration: 160, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 200, easing: Easing.bounce })));
    const t = setTimeout(() => (arrived = true), CREW_IN_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fade.value = withTiming(hideDibby ? 0 : 1, { duration: 160 });
  }, [hideDibby, fade]);

  const dibby = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: hop.value }] }));
  const cx = width / 2;
  const cy = height / 2;

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, width, height }}>
      {CREW.map((m, i) => (
        <Blob key={m.colour} {...m} left={m.x * width} top={m.y * height} towards={{ x: cx, y: cy }} delay={POP_START + i * POP_GAP} pop={pop} still={reduce} seed={i} />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: cx - SPLASH_SIZE / 2, top: cy - SPLASH_SIZE / 2, width: SPLASH_SIZE, height: SPLASH_SIZE }, dibby]}
      >
        <Image source={SPLASH} style={{ width: SPLASH_SIZE, height: SPLASH_SIZE }} contentFit="contain" accessible={false} />
      </Animated.View>
    </View>
  );
}

function Blob({
  colour,
  left,
  top,
  size,
  shape,
  towards,
  delay,
  pop,
  still,
  seed,
}: {
  colour: ColourName;
  left: number;
  top: number;
  size: number;
  shape: Shape;
  towards: { x: number; y: number };
  delay: number;
  pop: boolean;
  still: boolean;
  seed: number;
}) {
  const fill = useColour(colour);
  const scale = useSharedValue(pop ? 0 : 1);
  const bob = useSharedValue(0);
  const boing = useSharedValue(0);

  useEffect(() => {
    if (pop) scale.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 170, mass: 0.8 }));
    if (still) return;
    // Each bobs at its own pace, so they never move in step.
    const period = 2200 + ((seed * 487) % 1300);
    bob.value = withDelay(pop ? delay + 300 : (seed * 230) % 900, withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amp = 5 + (seed % 3) * 2;
  const tilt = seed % 2 ? 6 : -6;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: (bob.value - 0.5) * 2 * amp },
      { rotate: `${(bob.value - 0.5) * tilt}deg` },
      { scaleX: scale.value * (1 + boing.value * 0.18) },
      { scaleY: scale.value * (1 - boing.value * 0.18) },
    ],
  }));

  // Eyes looking Dibby's way.
  const dx = towards.x - left;
  const dy = towards.y - top;
  const d = Math.hypot(dx, dy) || 1;
  const look = { x: (dx / d) * size * 0.08, y: (dy / d) * size * 0.06 };
  const eye = Math.max(5, size * 0.12);
  const radius = shape === "circle" ? size / 2 : shape === "squircle" ? size * 0.32 : size / 2;

  return (
    <Pressable
      accessible={false}
      onPress={() => {
        Haptics.selectionAsync();
        boing.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, { damping: 5, stiffness: 260 }));
      }}
      style={{ position: "absolute", left: left - size / 2, top: top - size / 2, width: size, height: size * (shape === "egg" ? 1.12 : 1) }}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: fill,
            borderRadius: radius,
            borderTopLeftRadius: shape === "egg" ? size * 0.55 : radius,
            borderTopRightRadius: shape === "egg" ? size * 0.55 : radius,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: eye * 0.9,
          },
          style,
        ]}
      >
        {[0, 1].map((k) => (
          <View
            key={k}
            className="bg-static-black"
            style={{ width: eye, height: eye * 1.25, borderRadius: eye, opacity: 0.8, transform: [{ translateX: look.x }, { translateY: look.y - size * 0.04 }] }}
          />
        ))}
      </Animated.View>
    </Pressable>
  );
}
