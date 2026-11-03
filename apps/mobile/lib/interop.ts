import { Animated, Image } from "react-native";
import { cssInterop } from "nativewind";

// NativeWind only maps className to style on components it knows. Animated.View (switch thumbs,
// sliding pills) and Image (avatars, Dibby's face) need telling once, before anything renders.
cssInterop(Animated.View, { className: "style" });
cssInterop(Image, { className: "style" });
