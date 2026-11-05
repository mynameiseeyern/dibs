import { Animated, Image } from "react-native";
import { cssInterop } from "nativewind";
import Reanimated from "react-native-reanimated";

// NativeWind only maps className to style on components it knows. Animated.View (switch thumbs,
// sliding pills) and Image (avatars, Dibby's face) need telling once, before anything renders.
cssInterop(Animated.View, { className: "style" });
cssInterop(Image, { className: "style" });

// Reanimated's components too: anything that eases in (the plan form's answers, the hello moment).
cssInterop(Reanimated.View, { className: "style" });
cssInterop(Reanimated.Text, { className: "style" });
