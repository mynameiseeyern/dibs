// AlignUI SegmentedControl, ported to React Native and styled to the Dibby one: two to four options
// in a bg-soft-200 track; the chosen one inverts to bg-strong-950 with white text, and the pill slides.
// <SegmentedControl.Root value={split} onValueChange={setSplit}>
//   <SegmentedControl.List><SegmentedControl.Trigger value="even">Even</SegmentedControl.Trigger>…</SegmentedControl.List>
//   <SegmentedControl.Content value="even">…</SegmentedControl.Content>
// </SegmentedControl.Root>

import { createContext, useContext, useState, type ReactNode } from "react";
import { Animated, Pressable, View, type ViewProps } from "react-native";
import * as Haptics from "expo-haptics";
import { tv } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { useShadow } from "@/lib/theme";
import { Icon as BaseIcon, type IconName } from "./icon";
import { useSlidingIndicator } from "./sliding-indicator";

export const segmentedControlVariants = tv({
  slots: {
    list: "w-full flex-row gap-1 rounded-md bg-bg-soft-200 p-1",
    indicator: "absolute bottom-1 top-1 rounded-[12px] bg-bg-strong-950",
    trigger: "min-h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-[12px] px-3",
    label: "text-label-sm text-text-sub-600",
    icon: "text-[16px] leading-[16px] text-text-sub-600",
  },
  variants: {
    active: { true: { label: "text-text-white-0", icon: "text-text-white-0" } },
    disabled: { true: { label: "text-text-disabled-300", icon: "text-text-disabled-300" } },
  },
});

type Ctx = {
  value?: string;
  select: (v: string) => void;
  measure: ReturnType<typeof useSlidingIndicator>["measure"];
  indicator: ReturnType<typeof useSlidingIndicator>;
};
const SegmentedContext = createContext<Ctx | null>(null);
const TriggerContext = createContext<{ active: boolean; disabled?: boolean }>({ active: false });
const use = () => {
  const ctx = useContext(SegmentedContext);
  if (!ctx) throw new Error("SegmentedControl parts go inside SegmentedControl.Root");
  return ctx;
};

function SegmentedControlRoot({ value, defaultValue, onValueChange, children, ...rest }: ViewProps & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState(defaultValue);
  const current = value ?? own;
  const indicator = useSlidingIndicator(current);
  return (
    <SegmentedContext.Provider
      value={{
        value: current,
        measure: indicator.measure,
        indicator,
        select: (v) => {
          if (value === undefined) setOwn(v);
          onValueChange?.(v);
        },
      }}
    >
      <View {...rest}>{children}</View>
    </SegmentedContext.Provider>
  );
}

function SegmentedControlList({ className, children, ...rest }: ViewProps & { className?: string; children?: ReactNode }) {
  const { indicator } = use();
  const { list, indicator: pill } = segmentedControlVariants();
  const shadow = useShadow("xs");
  return (
    <View accessibilityRole="tablist" className={list({ class: className })} {...rest}>
      {indicator.visible ? <Animated.View className={pill()} style={[shadow, indicator.style]} /> : null}
      {children}
    </View>
  );
}

function SegmentedControlTrigger({ value, disabled, className, children, accessibilityLabel }: {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
}) {
  const ctx = use();
  const active = ctx.value === value;
  const { trigger, label } = segmentedControlVariants({ active, disabled });
  return (
    <TriggerContext.Provider value={{ active, disabled }}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: active, disabled: !!disabled }}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        // 36px to look at, 44px to tap.
        hitSlop={{ top: 4, bottom: 4 }}
        onLayout={ctx.measure(value)}
        onPress={() => {
          if (active) return;
          Haptics.selectionAsync();
          ctx.select(value);
        }}
        className={trigger({ class: className })}
      >
        {wrapText(children, label())}
      </Pressable>
    </TriggerContext.Provider>
  );
}

function SegmentedControlIcon({ name, className }: { name: IconName; className?: string }) {
  const { icon } = segmentedControlVariants(useContext(TriggerContext));
  return <BaseIcon name={name} className={icon({ class: className })} />;
}

/** Shown while its value is chosen. `forceMount` keeps it mounted (hidden) so its state survives. */
function SegmentedControlContent({ value, forceMount, ...rest }: ViewProps & { value: string; forceMount?: boolean; className?: string }) {
  const active = use().value === value;
  if (!active && !forceMount) return null;
  return <View {...rest} style={[rest.style, !active && { display: "none" }]} />;
}

export {
  SegmentedControlRoot as Root,
  SegmentedControlList as List,
  SegmentedControlTrigger as Trigger,
  SegmentedControlIcon as Icon,
  SegmentedControlContent as Content,
};
