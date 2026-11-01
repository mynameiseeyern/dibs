// AlignUI Button, ported to React Native and themed for Dibby. Same API as apps/web/components/ui/button:
// <Button.Root variant mode size block iconOnly><Button.Icon name="…" />Label</Button.Root>

import { createContext, useContext, useState, type ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import * as Haptics from "expo-haptics";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { useShadow } from "@/lib/theme";
import { Icon as BaseIcon, type IconName } from "./icon";

// Pills, Figtree 600, 44px default, a quick press-in, and the lime "dibs" sticker.
export const buttonVariants = tv({
  slots: {
    root: "flex-row items-center justify-center self-start rounded-full active:scale-[0.96]",
    label: "font-sans-semibold",
    icon: "text-[20px] leading-[20px]",
  },
  variants: {
    variant: { primary: {}, neutral: {}, error: {}, dibs: {} },
    mode: {
      filled: {},
      stroke: { root: "border-[1.5px]" },
      lighter: {},
      ghost: {},
    },
    size: {
      large: { root: "min-h-13 gap-2 px-6", label: "text-label-lg" },
      medium: { root: "min-h-11 gap-2 px-5", label: "text-label-md" },
      // 36px to look at; hitSlop takes the tap area to 44px.
      small: { root: "min-h-9 gap-2 px-4", label: "text-label-sm" },
    },
    block: { true: { root: "w-full self-stretch" } },
    iconOnly: { true: { root: "px-0" } },
    disabled: { true: {} },
  },
  compoundVariants: [
    { iconOnly: true, size: "large", class: { root: "w-13" } },
    { iconOnly: true, size: "medium", class: { root: "w-11" } },
    { iconOnly: true, size: "small", class: { root: "w-9" } },

    { variant: "primary", mode: "filled", class: { root: "bg-primary-base active:bg-primary-hover", label: "text-static-white", icon: "text-static-white" } },
    { variant: "primary", mode: "stroke", class: { root: "border-primary-base bg-bg-white-0 active:bg-primary-lighter", label: "text-primary-dark", icon: "text-primary-dark" } },
    { variant: "primary", mode: "lighter", class: { root: "bg-primary-lighter active:bg-primary-light", label: "text-primary-dark", icon: "text-primary-dark" } },
    { variant: "primary", mode: "ghost", class: { root: "bg-transparent active:bg-primary-lighter", label: "text-primary-dark", icon: "text-primary-dark" } },

    { variant: "neutral", mode: "filled", class: { root: "bg-bg-strong-950 active:bg-bg-surface-800", label: "text-text-white-0", icon: "text-text-white-0" } },
    { variant: "neutral", mode: "stroke", class: { root: "border-stroke-soft-200 bg-bg-white-0 active:bg-bg-weak-50", label: "text-text-strong-950", icon: "text-text-strong-950" } },
    { variant: "neutral", mode: "lighter", class: { root: "bg-bg-soft-200 active:bg-bg-sub-300", label: "text-text-strong-950", icon: "text-text-strong-950" } },
    { variant: "neutral", mode: "ghost", class: { root: "bg-transparent active:bg-bg-weak-50", label: "text-text-sub-600", icon: "text-text-sub-600" } },

    { variant: "error", mode: "filled", class: { root: "bg-error-base active:bg-error-light", label: "text-static-black", icon: "text-static-black" } },
    { variant: "error", mode: "stroke", class: { root: "border-error-base bg-bg-white-0 active:bg-error-lighter", label: "text-error-dark", icon: "text-error-dark" } },
    { variant: "error", mode: "lighter", class: { root: "bg-error-lighter active:bg-error-light", label: "text-error-dark", icon: "text-error-dark" } },
    { variant: "error", mode: "ghost", class: { root: "bg-transparent active:bg-error-lighter", label: "text-error-dark", icon: "text-error-dark" } },

    // The sticker: lime, ink border, a hard drop it sinks into when pressed. Once per screen.
    { variant: "dibs", class: { root: "border-2 border-static-black bg-accent-base active:translate-y-1 active:scale-100", label: "text-static-black", icon: "text-static-black" } },

    // Last, so it beats every variant's colours.
    { disabled: true, class: { root: "border-transparent bg-bg-soft-200 active:translate-y-0 active:scale-100", label: "text-text-disabled-300", icon: "text-text-disabled-300" } },
  ],
  defaultVariants: { variant: "primary", mode: "filled", size: "medium" },
});

type ButtonVariants = VariantProps<typeof buttonVariants>;
const ButtonContext = createContext<ButtonVariants>({});

type ButtonRootProps = Omit<PressableProps, "children"> &
  Omit<ButtonVariants, "disabled"> & { className?: string; children?: ReactNode };

function ButtonRoot({ variant, mode, size, block, iconOnly, disabled, className, children, onPress, onPressIn, onPressOut, style, ...rest }: ButtonRootProps) {
  const [pressed, setPressed] = useState(false);
  const shared = { variant, mode, size, block, iconOnly, disabled: !!disabled };
  const { root, label } = buttonVariants(shared);
  const pop = useShadow(variant === "dibs" && !disabled ? "pop" : null);
  return (
    <ButtonContext.Provider value={shared}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        hitSlop={size === "small" ? 4 : undefined}
        onPress={(e) => {
          Haptics.impactAsync(variant === "dibs" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
          onPress?.(e);
        }}
        onPressIn={(e) => {
          setPressed(true);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          setPressed(false);
          onPressOut?.(e);
        }}
        className={root({ class: className })}
        // A plain style, not a function: NativeWind merges it with the classes. The sticker's drop goes when it's pressed in.
        style={[pressed ? null : pop, typeof style === "function" ? undefined : style]}
        {...rest}
      >
        {wrapText(children, label())}
      </Pressable>
    </ButtonContext.Provider>
  );
}

function ButtonIcon({ name, className }: { name: IconName; className?: string }) {
  const { icon } = buttonVariants(useContext(ButtonContext));
  return <BaseIcon name={name} className={icon({ class: className })} />;
}

export { ButtonRoot as Root, ButtonIcon as Icon };
