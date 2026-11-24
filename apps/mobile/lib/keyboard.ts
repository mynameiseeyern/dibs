import { useEffect } from "react";
import { Dimensions, Keyboard, Platform, TurboModuleRegistry } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";

type KeyboardControllerLib = typeof import("react-native-keyboard-controller");

/**
 * react-native-keyboard-controller, or null when this build doesn't have its native code.
 *
 * It's a native module: builds made before it was added don't have it, but they still get OTA
 * updates (runtimeVersion is the app version), and importing it there crashes the screen. So it's
 * only required once the native side is confirmed; otherwise callers fall back to React Native's
 * own keyboard handling. Expo Go and every build from now on have it.
 */
export const keyboardController: KeyboardControllerLib | null = TurboModuleRegistry.get("KeyboardController")
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("react-native-keyboard-controller") as KeyboardControllerLib)
  : null;

/**
 * For builds without the library: the keyboard's height and how far it's up (0–1), as shared
 * values animated to the keyboard's own timing. iOS says where the keyboard will end up before it
 * moves, so this runs alongside it; Android only says once it's there. Off when `enabled` is false.
 */
export function useKeyboardFromEvents(enabled: boolean) {
  const height = useSharedValue(0);
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!enabled) return;
    const ios = Platform.OS === "ios";
    const go = (to: number, duration?: number) => {
      // iOS's keyboard curve, near enough; Android's is shorter and plainer.
      const timing = { duration: duration || 250, easing: ios ? KEYBOARD_EASING : Easing.out(Easing.quad) };
      height.value = withTiming(to, timing);
      progress.value = withTiming(to > 0 ? 1 : 0, timing);
    };
    const subs = ios
      ? // One event for show, hide, and the suggestion bar coming and going.
        [Keyboard.addListener("keyboardWillChangeFrame", (e) => go(Math.max(0, Dimensions.get("screen").height - e.endCoordinates.screenY), e.duration))]
      : [Keyboard.addListener("keyboardDidShow", (e) => go(e.endCoordinates.height, 200)), Keyboard.addListener("keyboardDidHide", () => go(0, 200))];
    return () => subs.forEach((s) => s.remove());
  }, [enabled, height, progress]);
  return { height, progress };
}

const KEYBOARD_EASING = Easing.bezier(0.38, 0.7, 0.125, 1);
