import { Text, View } from "react-native";
import Reanimated from "react-native-reanimated";

// Animated views that NativeWind leaves alone. lib/interop.ts hands Reanimated's own Animated.View
// and Animated.Text to NativeWind so className works on them, but on a phone its wrapper re-wraps
// the style in its own animated style, and a style that mixes layout with an animated style
// ([{ position: "absolute", bottom: 0 }, fade]) loses the layout, and any className with it. The
// web preview takes another path and looks fine. On the welcome screen that put the buttons at the
// top and Dibby at the bottom (TestFlight, Nov 2026).
//
// So: anything with a useAnimatedStyle style uses these, with plain styles and no className.
// Animated.View with only className and entering/exiting (no animated style) is fine as it is.
export const MotionView = Reanimated.createAnimatedComponent(View);
export const MotionText = Reanimated.createAnimatedComponent(Text);
