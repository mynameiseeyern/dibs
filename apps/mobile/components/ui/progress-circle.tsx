// AlignUI ProgressCircle, ported to React Native with react-native-svg: a ring that fills clockwise from
// the top, with optional words in the middle. <ProgressCircle.Root value={66} size="56">4/6</ProgressCircle.Root>

import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { useColour } from "@/lib/theme";

export const progressCircleVariants = tv({
  slots: {
    root: "items-center justify-center self-start",
    content: "absolute inset-0 items-center justify-center",
    text: "text-center text-text-strong-950",
  },
  variants: {
    size: {
      "80": { text: "text-label-sm" },
      "72": { text: "text-label-sm" },
      "64": { text: "text-label-sm" },
      "56": { text: "text-label-xs" },
      "48": { text: "text-label-xs" },
    },
  },
  defaultVariants: { size: "80" },
});

const SIZES = {
  "80": { strokeWidth: 6.4, radius: 40 },
  "72": { strokeWidth: 5.75, radius: 36 },
  "64": { strokeWidth: 5.1, radius: 32 },
  "56": { strokeWidth: 4.5, radius: 28 },
  "48": { strokeWidth: 6.7, radius: 24 },
} as const;

type ProgressCircleRootProps = ViewProps &
  VariantProps<typeof progressCircleVariants> & { className?: string; value?: number; max?: number; children?: ReactNode };

function ProgressCircleRoot({ value = 0, max = 100, size = "80", className, children, ...rest }: ProgressCircleRootProps) {
  const { root, content, text } = progressCircleVariants({ size });
  const track = useColour("bg-soft-200");
  const fill = useColour("primary-base");
  const { strokeWidth, radius } = SIZES[size];
  const safe = Math.min(max, Math.max(value, 0));
  const r = radius - strokeWidth / 2;
  const circumference = r * 2 * Math.PI;
  const offset = circumference - (max > 0 ? safe / max : 0) * circumference;
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: safe }} className={root({ class: className })} {...rest}>
      <Svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle r={r} cx={radius} cy={radius} strokeWidth={strokeWidth} fill="none" stroke={track} />
        {safe > 0 ? (
          <Circle
            r={r}
            cx={radius}
            cy={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            fill="none"
            stroke={fill}
          />
        ) : null}
      </Svg>
      {children != null ? <View className={content()}>{wrapText(children, text())}</View> : null}
    </View>
  );
}

export { ProgressCircleRoot as Root };
