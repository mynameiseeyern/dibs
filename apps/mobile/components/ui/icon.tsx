import { Text, type TextProps } from "react-native";
import { cn } from "@/utils/cn";
import { glyphs, type IconName } from "./icon-glyphs";

export type { IconName };

/**
 * A Remix Icon, from the same icon font the web uses (`ri-calendar-line` → name="calendar-line").
 * Colour and size come from classes, like text: `text-primary-base text-[20px]`.
 */
export function Icon({ name, className, ...rest }: TextProps & { name: IconName }) {
  return (
    <Text
      {...rest}
      accessible={false}
      importantForAccessibility="no"
      allowFontScaling={false}
      className={cn("text-[20px] leading-[20px] text-text-strong-950", className)}
      style={[rest.style, { fontFamily: "remixicon", fontWeight: "normal" }]}
    >
      {String.fromCodePoint(glyphs[name])}
    </Text>
  );
}
