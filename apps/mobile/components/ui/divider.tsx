// AlignUI Divider, ported to React Native. <Divider.Root />, or with words in the middle:
// <Divider.Root variant="line-text">or</Divider.Root>

import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";

export const dividerVariants = tv({
  slots: {
    root: "w-full flex-row items-center",
    line: "h-px flex-1 bg-stroke-soft-200",
    label: "text-subheading-xs uppercase text-text-soft-400",
  },
  variants: {
    variant: {
      line: { root: "h-px bg-stroke-soft-200" },
      "line-spacing": { root: "h-1" },
      "line-text": { root: "gap-2.5" },
      content: { root: "gap-2.5" },
      text: { root: "px-2 py-1" },
      "solid-text": { root: "bg-bg-weak-50 px-5 py-1.5" },
    },
  },
  defaultVariants: { variant: "line" },
});

type DividerVariants = VariantProps<typeof dividerVariants>;

function DividerRoot({ variant = "line", className, children, ...rest }: ViewProps & DividerVariants & { className?: string; children?: ReactNode }) {
  const { root, line, label } = dividerVariants({ variant });
  const between = variant === "line-text" || variant === "content";
  return (
    <View accessibilityRole={variant === "line" || variant === "line-spacing" ? "none" : undefined} className={root({ class: className })} {...rest}>
      {variant === "line-spacing" ? <View className={line()} /> : null}
      {between ? <View className={line()} /> : null}
      {variant === "line" || variant === "line-spacing" ? null : wrapText(children, label())}
      {between ? <View className={line()} /> : null}
    </View>
  );
}

export { DividerRoot as Root };
