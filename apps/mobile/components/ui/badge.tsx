// AlignUI Badge, ported to React Native and themed for Dibby: small pills for status ("Locked in",
// "Dibby"). <Badge.Root color="success"><Badge.Icon name="lock-2-line" />Locked in</Badge.Root>

import { createContext, useContext, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { Icon as BaseIcon, type IconName } from "./icon";

export const badgeVariants = tv({
  slots: {
    root: "flex-row items-center justify-center self-start rounded-full",
    label: "text-label-xs",
    icon: "text-[14px] leading-[14px]",
    dot: "size-1.5 rounded-full",
  },
  variants: {
    size: {
      small: { root: "h-5 gap-1 px-1.5" },
      medium: { root: "h-6 gap-1 px-2.5" },
    },
    variant: { filled: {}, light: {}, lighter: {}, stroke: { root: "border bg-bg-white-0" } },
    color: { primary: {}, accent: {}, information: {}, warning: {}, error: {}, success: {}, away: {}, feature: {}, verified: {}, highlighted: {}, stable: {}, faded: {} },
    disabled: { true: {} },
    square: { true: {} },
  },
  compoundVariants: [
    { variant: "filled", color: "primary", class: { root: "bg-primary-base", label: "text-static-white", icon: "text-static-white", dot: "bg-static-white" } },
    { variant: "light", color: "primary", class: { root: "bg-primary-light", label: "text-primary-dark", icon: "text-primary-dark", dot: "bg-primary-dark" } },
    { variant: "lighter", color: "primary", class: { root: "bg-primary-lighter", label: "text-primary-dark", icon: "text-primary-dark", dot: "bg-primary-dark" } },
    { variant: "stroke", color: "primary", class: { root: "border-primary-dark", label: "text-primary-dark", icon: "text-primary-dark", dot: "bg-primary-dark" } },
    { variant: "filled", color: "accent", class: { root: "bg-accent-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "accent", class: { root: "bg-accent-light", label: "text-accent-dark", icon: "text-accent-dark", dot: "bg-accent-dark" } },
    { variant: "lighter", color: "accent", class: { root: "bg-accent-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "stroke", color: "accent", class: { root: "border-accent-dark", label: "text-accent-dark", icon: "text-accent-dark", dot: "bg-accent-dark" } },
    { variant: "filled", color: "information", class: { root: "bg-information-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "information", class: { root: "bg-information-light", label: "text-information-dark", icon: "text-information-dark", dot: "bg-information-dark" } },
    { variant: "lighter", color: "information", class: { root: "bg-information-lighter", label: "text-information-dark", icon: "text-information-dark", dot: "bg-information-dark" } },
    { variant: "stroke", color: "information", class: { root: "border-information-dark", label: "text-information-dark", icon: "text-information-dark", dot: "bg-information-dark" } },
    { variant: "filled", color: "warning", class: { root: "bg-warning-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "warning", class: { root: "bg-warning-light", label: "text-warning-dark", icon: "text-warning-dark", dot: "bg-warning-dark" } },
    { variant: "lighter", color: "warning", class: { root: "bg-warning-lighter", label: "text-warning-dark", icon: "text-warning-dark", dot: "bg-warning-dark" } },
    { variant: "stroke", color: "warning", class: { root: "border-warning-dark", label: "text-warning-dark", icon: "text-warning-dark", dot: "bg-warning-dark" } },
    { variant: "filled", color: "error", class: { root: "bg-error-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "error", class: { root: "bg-error-light", label: "text-error-dark", icon: "text-error-dark", dot: "bg-error-dark" } },
    { variant: "lighter", color: "error", class: { root: "bg-error-lighter", label: "text-error-dark", icon: "text-error-dark", dot: "bg-error-dark" } },
    { variant: "stroke", color: "error", class: { root: "border-error-dark", label: "text-error-dark", icon: "text-error-dark", dot: "bg-error-dark" } },
    { variant: "filled", color: "success", class: { root: "bg-success-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "success", class: { root: "bg-success-light", label: "text-success-dark", icon: "text-success-dark", dot: "bg-success-dark" } },
    { variant: "lighter", color: "success", class: { root: "bg-success-lighter", label: "text-success-dark", icon: "text-success-dark", dot: "bg-success-dark" } },
    { variant: "stroke", color: "success", class: { root: "border-success-dark", label: "text-success-dark", icon: "text-success-dark", dot: "bg-success-dark" } },
    { variant: "filled", color: "away", class: { root: "bg-away-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "away", class: { root: "bg-away-light", label: "text-away-dark", icon: "text-away-dark", dot: "bg-away-dark" } },
    { variant: "lighter", color: "away", class: { root: "bg-away-lighter", label: "text-away-dark", icon: "text-away-dark", dot: "bg-away-dark" } },
    { variant: "stroke", color: "away", class: { root: "border-away-dark", label: "text-away-dark", icon: "text-away-dark", dot: "bg-away-dark" } },
    { variant: "filled", color: "feature", class: { root: "bg-feature-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "feature", class: { root: "bg-feature-light", label: "text-feature-dark", icon: "text-feature-dark", dot: "bg-feature-dark" } },
    { variant: "lighter", color: "feature", class: { root: "bg-feature-lighter", label: "text-feature-dark", icon: "text-feature-dark", dot: "bg-feature-dark" } },
    { variant: "stroke", color: "feature", class: { root: "border-feature-dark", label: "text-feature-dark", icon: "text-feature-dark", dot: "bg-feature-dark" } },
    { variant: "filled", color: "verified", class: { root: "bg-verified-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "verified", class: { root: "bg-verified-light", label: "text-verified-dark", icon: "text-verified-dark", dot: "bg-verified-dark" } },
    { variant: "lighter", color: "verified", class: { root: "bg-verified-lighter", label: "text-verified-dark", icon: "text-verified-dark", dot: "bg-verified-dark" } },
    { variant: "stroke", color: "verified", class: { root: "border-verified-dark", label: "text-verified-dark", icon: "text-verified-dark", dot: "bg-verified-dark" } },
    { variant: "filled", color: "highlighted", class: { root: "bg-highlighted-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "highlighted", class: { root: "bg-highlighted-light", label: "text-highlighted-dark", icon: "text-highlighted-dark", dot: "bg-highlighted-dark" } },
    { variant: "lighter", color: "highlighted", class: { root: "bg-highlighted-lighter", label: "text-highlighted-dark", icon: "text-highlighted-dark", dot: "bg-highlighted-dark" } },
    { variant: "stroke", color: "highlighted", class: { root: "border-highlighted-dark", label: "text-highlighted-dark", icon: "text-highlighted-dark", dot: "bg-highlighted-dark" } },
    { variant: "filled", color: "stable", class: { root: "bg-stable-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "stable", class: { root: "bg-stable-light", label: "text-stable-dark", icon: "text-stable-dark", dot: "bg-stable-dark" } },
    { variant: "lighter", color: "stable", class: { root: "bg-stable-lighter", label: "text-stable-dark", icon: "text-stable-dark", dot: "bg-stable-dark" } },
    { variant: "stroke", color: "stable", class: { root: "border-stable-dark", label: "text-stable-dark", icon: "text-stable-dark", dot: "bg-stable-dark" } },
    { variant: "filled", color: "faded", class: { root: "bg-faded-base", label: "text-static-black", icon: "text-static-black", dot: "bg-static-black" } },
    { variant: "light", color: "faded", class: { root: "bg-faded-light", label: "text-faded-dark", icon: "text-faded-dark", dot: "bg-faded-dark" } },
    { variant: "lighter", color: "faded", class: { root: "bg-faded-lighter", label: "text-faded-dark", icon: "text-faded-dark", dot: "bg-faded-dark" } },
    { variant: "stroke", color: "faded", class: { root: "border-faded-dark", label: "text-faded-dark", icon: "text-faded-dark", dot: "bg-faded-dark" } },
    { size: "small", square: true, class: { root: "min-w-5 px-1" } },
    { size: "medium", square: true, class: { root: "min-w-6 px-1.5" } },
    // Last, so it beats the colours.
    { disabled: true, class: { root: "border-transparent bg-bg-soft-200", label: "text-text-disabled-300", icon: "text-text-disabled-300", dot: "bg-text-disabled-300" } },
  ],
  defaultVariants: { variant: "lighter", size: "medium", color: "primary" },
});

type BadgeVariants = VariantProps<typeof badgeVariants>;
const BadgeContext = createContext<BadgeVariants>({});

export type BadgeRootProps = ViewProps & BadgeVariants & { className?: string; children?: ReactNode };

function BadgeRoot({ size, variant, color, disabled, square, className, children, ...rest }: BadgeRootProps) {
  const shared = { size, variant, color, disabled, square };
  const { root, label } = badgeVariants(shared);
  return (
    <BadgeContext.Provider value={shared}>
      <View className={root({ class: className })} {...rest}>
        {wrapText(children, label())}
      </View>
    </BadgeContext.Provider>
  );
}

function BadgeIcon({ name, className }: { name: IconName; className?: string }) {
  const { icon } = badgeVariants(useContext(BadgeContext));
  return <BaseIcon name={name} className={icon({ class: className })} />;
}

function BadgeDot({ className }: { className?: string }) {
  const { dot } = badgeVariants(useContext(BadgeContext));
  return <View className={dot({ class: className })} />;
}

export { BadgeRoot as Root, BadgeIcon as Icon, BadgeDot as Dot };
