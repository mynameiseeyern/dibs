// AlignUI ProgressBar, ported to React Native. Dibby Progress: a 10px pill track, violet fill by default.
// <ProgressBar.Root value={settled} max={shares} color="accent" accessibilityLabel="Settled" />

import { View, type ViewProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";

export const progressBarVariants = tv({
  slots: {
    root: "h-2.5 w-full overflow-hidden rounded-full bg-bg-soft-200",
    progress: "h-full rounded-full",
  },
  variants: {
    color: {
      primary: { progress: "bg-primary-bar" },
      // Lime gets an ink edge so it reads on the light track.
      accent: { progress: "border-[1.5px] border-stroke-strong-950 bg-accent-base" },
      success: { progress: "bg-success-dark" },
      information: { progress: "bg-information-base" },
      warning: { progress: "bg-warning-base" },
      error: { progress: "bg-error-base" },
    },
  },
  defaultVariants: { color: "primary" },
});

type ProgressBarRootProps = ViewProps & VariantProps<typeof progressBarVariants> & { className?: string; value?: number; max?: number };

function ProgressBarRoot({ color, value = 0, max = 100, className, ...rest }: ProgressBarRootProps) {
  const { root, progress } = progressBarVariants({ color });
  const safe = Math.min(max, Math.max(value, 0));
  const pct = max > 0 ? (safe / max) * 100 : 0;
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: safe }} className={root({ class: className })} {...rest}>
      {pct > 0 ? <View className={progress()} style={{ width: `${pct}%` }} /> : null}
    </View>
  );
}

export { ProgressBarRoot as Root };
