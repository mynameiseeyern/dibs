// Room at the bottom of a screen as tall as the keyboard, so whatever's above it (a pinned button,
// a composer) rides up with the keyboard as one piece. Put it last in a full-height column, and wrap
// the screen in <KeyboardRoot>. With react-native-keyboard-controller (new builds, Expo Go) it
// follows the keyboard frame by frame; older builds use the keyboard's events (lib/keyboard.ts).

import type { ReactNode } from "react";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { keyboardController, useKeyboardFromEvents } from "@/lib/keyboard";

/** The library's provider when this build has it; nothing otherwise. */
export function KeyboardRoot({ children }: { children: ReactNode }) {
  const KC = keyboardController;
  return KC ? <KC.KeyboardProvider>{children}</KC.KeyboardProvider> : <>{children}</>;
}

/** `less`: padding the content above already has at the bottom (the home indicator's), taken off. */
export function KeyboardSpacer({ less = 0 }: { less?: number }) {
  return keyboardController ? <FromLibrary less={less} /> : <FromEvents less={less} />;
}

function FromLibrary({ less }: { less: number }) {
  // The library's height is negative while the keyboard's up.
  const { height } = keyboardController!.useReanimatedKeyboardAnimation();
  return <Space height={height} sign={-1} less={less} />;
}

function FromEvents({ less }: { less: number }) {
  const { height } = useKeyboardFromEvents(true);
  return <Space height={height} sign={1} less={less} />;
}

function Space({ height, sign, less }: { height: SharedValue<number>; sign: 1 | -1; less: number }) {
  const style = useAnimatedStyle(() => ({ height: Math.max(0, sign * height.value - less) }));
  return <Animated.View style={style} />;
}
