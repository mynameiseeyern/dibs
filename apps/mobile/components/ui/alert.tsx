// AlignUI Alert, ported to React Native and themed for Dibby. Soft fill with -dark text (lighter, the
// default), radius-lg, Figtree 14/22, a 20px icon and an optional bold title line.
// <Alert.Root status="success"><Alert.Icon name="mail-check-fill" /><Alert.Content><Alert.Title>Check your email</Alert.Title>Tap the link…</Alert.Content></Alert.Root>

import { createContext, useContext, type ReactNode } from "react";
import { Pressable, Text, View, type TextProps, type ViewProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { useShadow } from "@/lib/theme";
import { Icon as BaseIcon, type IconName } from "./icon";

const STATUSES = ["error", "warning", "success", "information", "feature", "away"] as const;
type Status = (typeof STATUSES)[number];

/** The icon each status gets when <Alert.Icon /> is given no name. */
export const STATUS_ICONS: Record<Status, IconName> = {
  error: "error-warning-fill",
  warning: "alert-fill",
  success: "checkbox-circle-fill",
  information: "information-fill",
  feature: "sparkling-fill",
  away: "time-fill",
};


export const alertVariants = tv({
  slots: {
    root: "w-full flex-row items-start",
    content: "flex-1",
    text: "text-paragraph-sm",
    title: "text-label-md",
    icon: "text-[20px] leading-[22px]",
    closeIcon: "text-[20px] leading-[22px] opacity-60",
  },
  variants: {
    variant: {
      filled: {},
      light: {},
      lighter: {},
      stroke: { root: "border border-stroke-soft-200 bg-bg-white-0" },
    },
    status: { error: {}, warning: {}, success: {}, information: {}, feature: {}, away: {} },
    size: {
      small: { root: "gap-2 rounded-md px-3 py-2.5" },
      large: { root: "gap-3 rounded-lg p-4" },
    },
  },
  // Spelled out per status so Tailwind can see every class.
  compoundVariants: [
    { variant: "filled", status: "error", class: { root: "bg-error-base", text: "text-static-black", title: "text-static-black", icon: "text-static-black", closeIcon: "text-static-black" } },
    { variant: "light", status: "error", class: { root: "bg-error-light", text: "text-error-dark", title: "text-error-dark", icon: "text-error-dark", closeIcon: "text-error-dark" } },
    { variant: "lighter", status: "error", class: { root: "bg-error-lighter", text: "text-error-dark", title: "text-error-dark", icon: "text-error-dark", closeIcon: "text-error-dark" } },
    { variant: "stroke", status: "error", class: { icon: "text-error-dark" } },
    { variant: "filled", status: "warning", class: { root: "bg-warning-base", text: "text-static-black", title: "text-static-black", icon: "text-static-black", closeIcon: "text-static-black" } },
    { variant: "light", status: "warning", class: { root: "bg-warning-light", text: "text-warning-dark", title: "text-warning-dark", icon: "text-warning-dark", closeIcon: "text-warning-dark" } },
    { variant: "lighter", status: "warning", class: { root: "bg-warning-lighter", text: "text-warning-dark", title: "text-warning-dark", icon: "text-warning-dark", closeIcon: "text-warning-dark" } },
    { variant: "stroke", status: "warning", class: { icon: "text-warning-dark" } },
    { variant: "filled", status: "success", class: { root: "bg-success-base", text: "text-static-black", title: "text-static-black", icon: "text-static-black", closeIcon: "text-static-black" } },
    { variant: "light", status: "success", class: { root: "bg-success-light", text: "text-success-dark", title: "text-success-dark", icon: "text-success-dark", closeIcon: "text-success-dark" } },
    { variant: "lighter", status: "success", class: { root: "bg-success-lighter", text: "text-success-dark", title: "text-success-dark", icon: "text-success-dark", closeIcon: "text-success-dark" } },
    { variant: "stroke", status: "success", class: { icon: "text-success-dark" } },
    { variant: "filled", status: "information", class: { root: "bg-information-base", text: "text-static-black", title: "text-static-black", icon: "text-static-black", closeIcon: "text-static-black" } },
    { variant: "light", status: "information", class: { root: "bg-information-light", text: "text-information-dark", title: "text-information-dark", icon: "text-information-dark", closeIcon: "text-information-dark" } },
    { variant: "lighter", status: "information", class: { root: "bg-information-lighter", text: "text-information-dark", title: "text-information-dark", icon: "text-information-dark", closeIcon: "text-information-dark" } },
    { variant: "stroke", status: "information", class: { icon: "text-information-dark" } },
    { variant: "filled", status: "feature", class: { root: "bg-feature-base", text: "text-static-black", title: "text-static-black", icon: "text-static-black", closeIcon: "text-static-black" } },
    { variant: "light", status: "feature", class: { root: "bg-feature-light", text: "text-feature-dark", title: "text-feature-dark", icon: "text-feature-dark", closeIcon: "text-feature-dark" } },
    { variant: "lighter", status: "feature", class: { root: "bg-feature-lighter", text: "text-feature-dark", title: "text-feature-dark", icon: "text-feature-dark", closeIcon: "text-feature-dark" } },
    { variant: "stroke", status: "feature", class: { icon: "text-feature-dark" } },
    { variant: "filled", status: "away", class: { root: "bg-away-base", text: "text-static-black", title: "text-static-black", icon: "text-static-black", closeIcon: "text-static-black" } },
    { variant: "light", status: "away", class: { root: "bg-away-light", text: "text-away-dark", title: "text-away-dark", icon: "text-away-dark", closeIcon: "text-away-dark" } },
    { variant: "lighter", status: "away", class: { root: "bg-away-lighter", text: "text-away-dark", title: "text-away-dark", icon: "text-away-dark", closeIcon: "text-away-dark" } },
    { variant: "stroke", status: "away", class: { icon: "text-away-dark" } },
    { variant: "stroke", class: { text: "text-text-strong-950", title: "text-text-strong-950", closeIcon: "text-text-sub-600" } },
  ],
  defaultVariants: { size: "large", variant: "lighter", status: "information" },
});

type AlertVariants = VariantProps<typeof alertVariants>;
const AlertContext = createContext<AlertVariants>({});

export type AlertRootProps = ViewProps & AlertVariants & { className?: string; children?: ReactNode };

function AlertRoot({ size, variant, status, className, children, style, ...rest }: AlertRootProps) {
  const shared = { size, variant, status };
  const { root, text } = alertVariants(shared);
  const shadow = useShadow(variant === "stroke" ? "md" : null);
  return (
    <AlertContext.Provider value={shared}>
      <View accessibilityRole={status === "error" ? "alert" : "summary"} className={root({ class: className })} style={[shadow, style]} {...rest}>
        {wrapText(children, text({ class: "flex-1" }))}
      </View>
    </AlertContext.Provider>
  );
}

/** Leave `name` out to get the status's own icon. */
function AlertIcon({ name, className }: { name?: IconName; className?: string }) {
  const ctx = useContext(AlertContext);
  const { icon } = alertVariants(ctx);
  return <BaseIcon name={name ?? STATUS_ICONS[(ctx.status ?? "information") as Status]} className={icon({ class: className })} />;
}

/** The text column: an optional <Alert.Title /> then the message. */
function AlertContent({ className, children, ...rest }: ViewProps & { className?: string; children?: ReactNode }) {
  const { content, text } = alertVariants(useContext(AlertContext));
  return (
    <View className={content({ class: className })} {...rest}>
      {wrapText(children, text())}
    </View>
  );
}

function AlertTitle({ className, ...rest }: TextProps & { className?: string }) {
  const { title } = alertVariants(useContext(AlertContext));
  return <Text className={title({ class: className })} {...rest} />;
}

function AlertCloseIcon({ onPress, className, accessibilityLabel = "Dismiss" }: { onPress?: () => void; className?: string; accessibilityLabel?: string }) {
  const { closeIcon } = alertVariants(useContext(AlertContext));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={12} onPress={onPress}>
      <BaseIcon name="close-line" className={closeIcon({ class: className })} />
    </Pressable>
  );
}

export { AlertRoot as Root, AlertIcon as Icon, AlertContent as Content, AlertTitle as Title, AlertCloseIcon as CloseIcon };
