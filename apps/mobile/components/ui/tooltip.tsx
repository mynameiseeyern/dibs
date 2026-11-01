// AlignUI Tooltip, ported to React Native. Phones have no hover, so it shows on a long press of the
// trigger and fades after a moment. Never put anything essential in one.
// <Tooltip.Root><Tooltip.Trigger><Button.Root>…</Button.Root></Tooltip.Trigger><Tooltip.Content>Only you can see this</Tooltip.Content></Tooltip.Root>

import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useRef, type ReactElement, type ReactNode } from "react";
import { Animated, Pressable, Text, View, type GestureResponderEvent } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { useShadow } from "@/lib/theme";
import { useControllableOpen } from "./sheet";

export const tooltipVariants = tv({
  slots: {
    position: "absolute bottom-full left-0 z-50 mb-2 w-60",
    content: "self-start",
    label: "",
  },
  variants: {
    size: {
      xsmall: { content: "rounded-xs px-1.5 py-0.5", label: "text-paragraph-xs" },
      small: { content: "max-w-60 rounded-sm px-3 py-2", label: "font-sans-medium text-[14px] leading-5" },
      medium: { content: "max-w-60 rounded-xl p-3", label: "text-label-sm" },
    },
    variant: {
      dark: { content: "bg-bg-surface-800", label: "text-text-white-0" },
      light: { content: "border border-stroke-soft-200 bg-bg-white-0", label: "text-text-strong-950" },
    },
  },
  defaultVariants: { size: "small", variant: "dark" },
});

type TooltipVariants = VariantProps<typeof tooltipVariants>;
type State = { open: boolean; setOpen: (o: boolean) => void };
const TooltipContext = createContext<State>({ open: false, setOpen: () => {} });

/** Kept for the web's API; nothing to set up on a phone. */
const TooltipProvider = ({ children }: { children?: ReactNode; delayDuration?: number }) => <>{children}</>;

function TooltipRoot({ open, defaultOpen, onOpenChange, children }: { open?: boolean; defaultOpen?: boolean; onOpenChange?: (o: boolean) => void; children?: ReactNode; delayDuration?: number }) {
  const [isOpen, setOpen] = useControllableOpen(open, defaultOpen, onOpenChange);
  return (
    <TooltipContext.Provider value={{ open: isOpen, setOpen }}>
      {/* Anchors the label above the trigger. */}
      <View className="relative self-start">{children}</View>
    </TooltipContext.Provider>
  );
}

type LongPressish = ReactElement<{ onLongPress?: (e: GestureResponderEvent) => void; onPressOut?: (e: GestureResponderEvent) => void }>;

function TooltipTrigger({ children }: { children: ReactNode; asChild?: boolean }) {
  const { setOpen } = useContext(TooltipContext);
  const child = Children.only(children);
  // A pressable child (Button.Root) gets the long press added; anything else is wrapped.
  if (isValidElement(child) && typeof child.type !== "string") {
    const el = child as LongPressish;
    return cloneElement(el, {
      onLongPress: (e: GestureResponderEvent) => {
        el.props.onLongPress?.(e);
        setOpen(true);
      },
    });
  }
  return (
    <Pressable accessibilityHint="Long press for more" onLongPress={() => setOpen(true)}>
      {children}
    </Pressable>
  );
}

function TooltipContent({ size, variant, className, children, hideAfter = 2500 }: TooltipVariants & { className?: string; children?: ReactNode; side?: string; align?: string; sideOffset?: number; hideAfter?: number }) {
  const { open, setOpen } = useContext(TooltipContext);
  const fade = useRef(new Animated.Value(0)).current;
  const shadow = useShadow("md");
  useEffect(() => {
    Animated.timing(fade, { toValue: open ? 1 : 0, duration: 150, useNativeDriver: true }).start();
    if (!open || !hideAfter) return;
    const t = setTimeout(() => setOpen(false), hideAfter);
    return () => clearTimeout(t);
  }, [open, fade, hideAfter, setOpen]);
  const { position, content, label } = tooltipVariants({ size, variant });
  if (!open) return null;
  // The wrapper sets the 240px limit; the bubble hugs its text inside it.
  return (
    <Animated.View accessibilityLiveRegion="polite" pointerEvents="none" className={position()} style={{ opacity: fade }}>
      <View className={content({ class: className })} style={shadow}>
        {typeof children === "string" ? <Text className={label()}>{children}</Text> : children}
      </View>
    </Animated.View>
  );
}

export { TooltipProvider as Provider, TooltipRoot as Root, TooltipTrigger as Trigger, TooltipContent as Content };
