// The moment someone taps "Make plans": everything around Dibby fades away (the chat, the name,
// the buttons) and he's left on his own in the middle. He gives a little hop, lands in his talking
// pose and says hi, a line at a time in a speech bubble over his head (his talking clip, mouth
// moving). Then he hops up to the top of the form, where he asks the first question (app/new.tsx).
// Tap to hurry him along; Skip, top right, goes straight to the first question. With Reduce Motion
// or a screen reader on there's no moment at all.
//
// He starts as exactly the welcome screen's Dibby (the splash image, same size, same place: the
// same flex column as crew-scene.tsx), so the switch is invisible; he changes pose mid-hop.

import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { DIBBY, useScreenReader } from "./flow";
import { HERO_SIZE, HERO_TOP } from "./hero";
import { SPLASH_SIZE } from "./crew-scene";
import { useShadow } from "@/lib/theme";
import { MotionView } from "@/lib/motion";

const SPLASH = require("../../assets/splash-dibby.png");
const TALK = require("../../assets/dibby/motion/talk-hi.webp");
/**
 * The pose stills and talking clips are framed bigger in their box than the splash image: at this
 * size, centred on the same point, he's the same height with his feet in the same place.
 */
const POSE_SIZE = 150;

/** What he says, a line at a time. */
const LINES = ["Hi, I’m Dibby!", "I help your crew pick a day and a place.", "Then I make sure it actually happens. Let’s go!"];
/** How long a line stays up: a relaxed pace per word, never under 1.4 seconds. */
const lineFor = (s: string) => Math.max(1400, s.split(/\s+/).length * 230 + 500);

const T = { fade: 280, crouch: 110, air: 340, fly: 460 };

export function DibbyHello({ active, onDone }: { active: boolean; onDone: () => void }) {
  const reduced = useReducedMotion();
  const reader = useScreenReader();
  const reduce = reduced || reader;
  const insets = useSafeAreaInsets();
  const bubbleShadow = useShadow("sm");

  const [pose, setPose] = useState<"splash" | "talk" | "still">("splash");
  const [line, setLine] = useState(-1);
  const [centre, setCentre] = useState<number | null>(null);
  const done = useRef(false);
  const flying = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lift = useSharedValue(0);
  const squash = useSharedValue(0);
  const fly = useSharedValue(0);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  /** Up to the first question: he shrinks to the form's size on the way, landing feet first. */
  const leave = () => {
    if (flying.current) return;
    flying.current = true;
    if (timer.current) clearTimeout(timer.current);
    setLine(-1);
    setPose("still");
    fly.value = withTiming(1, { duration: T.fly, easing: Easing.inOut(Easing.cubic) });
    timer.current = setTimeout(finish, T.fly);
  };

  /** On to the next line, or off he goes after the last. */
  const next = (from: number) => {
    if (flying.current) return;
    if (timer.current) clearTimeout(timer.current);
    const n = from + 1;
    if (n >= LINES.length) return leave();
    setLine(n);
    Haptics.selectionAsync();
    timer.current = setTimeout(() => next(n), lineFor(LINES[n]));
  };

  useEffect(() => {
    if (!active) {
      // Reset for next time (back from the form to the welcome screen).
      done.current = false;
      flying.current = false;
      setPose("splash");
      setLine(-1);
      lift.value = 0;
      fly.value = 0;
      return;
    }
    if (reduce) return finish();
    // A little hop on the spot, changing pose at the top, while everything else fades.
    squash.value = withSequence(withTiming(1, { duration: T.crouch }), withTiming(0, { duration: 90 }));
    lift.value = withSequence(
      withTiming(0, { duration: T.fade - 60 }),
      withTiming(-28, { duration: T.air / 2, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: T.air / 2, easing: Easing.in(Easing.quad) })
    );
    const timers = [
      setTimeout(() => setPose("talk"), T.fade - 60 + T.air / 3),
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        next(-1);
      }, T.fade - 60 + T.air),
    ];
    return () => {
      timers.forEach(clearTimeout);
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduce]);

  // Where he lands: centred under the top bar at the form's size (hero.tsx), feet lined up.
  const heroFeet = insets.top + HERO_TOP + HERO_SIZE * 0.946;
  const myFeet = (centre ?? 0) - POSE_SIZE / 2 + POSE_SIZE * 0.946;
  const scale = HERO_SIZE / POSE_SIZE;

  const body = useAnimatedStyle(() => {
    const dy = (heroFeet - myFeet) * fly.value - Math.sin(fly.value * Math.PI) * 50;
    return {
      transform: [
        { translateY: lift.value + dy },
        { scaleX: (1 + (scale - 1) * fly.value) * (1 + squash.value * 0.06) },
        { scaleY: (1 + (scale - 1) * fly.value) * (1 - squash.value * 0.08) },
      ],
    };
  });

  if (!active || reduce) return null;

  return (
    // A layer over the welcome screen (it has no header, so it covers everything), not a Modal:
    // the same on iOS, Android and the web preview, and the theme's colours reach it.
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Pressable accessibilityRole="button" accessibilityLabel="Next" style={StyleSheet.absoluteFill} onPress={() => (line >= 0 ? next(line) : undefined)}>
        {/* Same column as crew-scene.tsx: Dibby between two equal spacers, so he's where he was. */}
        <View pointerEvents="none" style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 24 }}>
          {line >= 0 ? (
            <MotionView entering={FadeIn.duration(220)} style={{ marginBottom: -12, alignItems: "center" }}>
              <View className="max-w-[300px] rounded-xl border border-stroke-soft-200 bg-bg-white-0 px-5 py-3" style={bubbleShadow}>
                {/* The bubble stays; only the words change, fading in. */}
                <MotionView key={line} entering={FadeIn.duration(200)}>
                  <Text accessibilityLiveRegion="polite" className={line === 0 ? "text-center text-title-h4 text-text-strong-950" : "text-center text-paragraph-lg text-text-strong-950"}>
                    {LINES[line]}
                  </Text>
                </MotionView>
              </View>
              {/* The bubble's tail, pointing down at him. */}
              <View className="-mt-[7px] size-3.5 rotate-45 border-b border-r border-stroke-soft-200 bg-bg-white-0" />
            </MotionView>
          ) : null}
        </View>
        <View
          pointerEvents="none"
          onLayout={(e) => setCentre(e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2)}
          style={{ height: SPLASH_SIZE, alignItems: "center", justifyContent: "center" }}
        >
          <MotionView style={[{ width: SPLASH_SIZE, height: SPLASH_SIZE, alignItems: "center", justifyContent: "center", transformOrigin: "50% 83%" }, body]}>
            {pose === "splash" ? (
              <Image source={SPLASH} style={{ width: SPLASH_SIZE, height: SPLASH_SIZE }} contentFit="contain" accessible={false} />
            ) : (
              <Image source={pose === "talk" ? TALK : DIBBY.hi} style={{ width: POSE_SIZE, height: POSE_SIZE }} contentFit="contain" accessible={false} />
            )}
          </MotionView>
        </View>
        <View pointerEvents="none" style={{ flex: 1, alignItems: "center", paddingTop: 40 }}>
          {line >= 0 ? (
            <MotionView entering={FadeIn.delay(600).duration(300)}>
              <Text className="text-label-sm text-text-soft-400">Tap to keep going</Text>
            </MotionView>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip"
        hitSlop={12}
        onPress={() => {
          if (timer.current) clearTimeout(timer.current);
          finish();
        }}
        style={{ position: "absolute", top: insets.top + 8, right: 16 }}
        className="min-h-11 justify-center rounded-full bg-bg-white-0/90 px-4"
      >
        <Text className="text-label-md text-text-strong-950">Skip</Text>
      </Pressable>
    </View>
  );
}
