import { Pressable, Text, type PressableProps } from "react-native";
import * as Haptics from "expo-haptics";
import { font, radius, useTheme } from "@/lib/theme";

/** The pinned main action: large, full width, violet. Mirrors `<Button.Root size="large" block>`. */
export function Button({ label, onPress, disabled, ...rest }: PressableProps & { label: string }) {
  const { colour } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: radius["radius-md"],
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? colour["primary-dark"] : colour["primary-base"],
        opacity: disabled ? 0.5 : 1,
      })}
      {...rest}
    >
      <Text style={{ color: colour["static-white"], fontFamily: font.sansBold, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}
