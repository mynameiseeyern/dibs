import { TurboModuleRegistry } from "react-native";

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
