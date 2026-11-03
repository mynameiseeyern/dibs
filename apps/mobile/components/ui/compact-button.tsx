// AlignUI CompactButton, ported to React Native: an icon-only control (close, more). 44px, or 36px in
// dense rows. <CompactButton.Root variant="ghost" accessibilityLabel="Close"><CompactButton.Icon name="close-line" /></CompactButton.Root>

import { createContext, useContext, type ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { useShadow } from "@/lib/theme";
import { Icon as BaseIcon, type IconName } from "./icon";

export const compactButtonVariants = tv({
  slots: {
    root: "items-center justify-center",
    icon: "text-text-sub-600",
  },
  variants: {
    variant: {
      stroke: { root: "border border-stroke-soft-200 bg-bg-white-0 active:border-transparent active:bg-bg-weak-50" },
      ghost: { root: "bg-transparent active:bg-bg-weak-50" },
      white: { root: "bg-bg-white-0 active:bg-bg-weak-50" },
      modifiable: {},
    },
    size: {
      large: { root: "size-11", icon: "text-[20px] leading-[20px]" },
      medium: { root: "size-9", icon: "text-[18px] leading-[18px]" },
    },
    fullRadius: {
      true: { root: "rounded-full" },
      false: { root: "rounded-md" },
    },
    disabled: { true: {} },
  },
  compoundVariants: [{ disabled: true, class: { root: "border-transparent bg-transparent", icon: "text-text-disabled-300" } }],
  defaultVariants: { variant: "stroke", size: "large", fullRadius: true },
});

type CompactButtonVariants = VariantProps<typeof compactButtonVariants>;
const CompactButtonContext = createContext<CompactButtonVariants>({});

type CompactButtonRootProps = Omit<PressableProps, "children"> &
  Omit<CompactButtonVariants, "disabled"> & { className?: string; children?: ReactNode; accessibilityLabel: string };

function CompactButtonRoot({ variant, size, fullRadius, disabled, className, children, style, ...rest }: CompactButtonRootProps) {
  const shared = { variant, size, fullRadius, disabled: !!disabled };
  const { root } = compactButtonVariants(shared);
  const shadow = useShadow(!disabled && (variant ?? "stroke") !== "ghost" && variant !== "modifiable" ? "xs" : null);
  return (
    <CompactButtonContext.Provider value={shared}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        hitSlop={size === "medium" ? 4 : undefined}
        className={root({ class: className })}
        style={[shadow, typeof style === "function" ? undefined : style]}
        {...rest}
      >
        {children}
      </Pressable>
    </CompactButtonContext.Provider>
  );
}

function CompactButtonIcon({ name, className }: { name: IconName; className?: string }) {
  const { icon } = compactButtonVariants(useContext(CompactButtonContext));
  return <BaseIcon name={name} className={icon({ class: className })} />;
}

export { CompactButtonRoot as Root, CompactButtonIcon as Icon };
