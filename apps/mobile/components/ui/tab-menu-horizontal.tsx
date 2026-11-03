// AlignUI TabMenuHorizontal, ported to React Native and styled to the Dibby TabMenu: pill tabs, the
// current one a primary-base pill that slides across, and the row scrolls sideways rather than wrapping.
// <TabMenuHorizontal.Root value={tab} onValueChange={setTab}>
//   <TabMenuHorizontal.List><TabMenuHorizontal.Trigger value="chat"><TabMenuHorizontal.Icon name="chat-3-line" />Chat</TabMenuHorizontal.Trigger></TabMenuHorizontal.List>
//   <TabMenuHorizontal.Content value="chat">…</TabMenuHorizontal.Content>
// </TabMenuHorizontal.Root>

import { createContext, useContext, useState, type ReactNode } from "react";
import { Animated, Pressable, ScrollView, View, type ViewProps } from "react-native";
import * as Haptics from "expo-haptics";
import { tv } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { Icon as BaseIcon, type IconName } from "./icon";
import { useSlidingIndicator } from "./sliding-indicator";

export const tabMenuHorizontalVariants = tv({
  slots: {
    list: "flex-row gap-1",
    indicator: "absolute bottom-0 top-0 rounded-full bg-primary-base",
    trigger: "min-h-11 flex-row items-center gap-2 rounded-full px-4",
    label: "text-label-sm text-text-sub-600",
    icon: "text-[20px] leading-[20px] text-text-sub-600",
  },
  variants: {
    active: { true: { label: "text-static-white", icon: "text-static-white" } },
    disabled: { true: { label: "text-text-disabled-300", icon: "text-text-disabled-300" } },
  },
});

type Ctx = { value?: string; select: (v: string) => void; indicator: ReturnType<typeof useSlidingIndicator> };
const TabContext = createContext<Ctx | null>(null);
const TriggerContext = createContext<{ active: boolean; disabled?: boolean }>({ active: false });
const use = () => {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("TabMenuHorizontal parts go inside TabMenuHorizontal.Root");
  return ctx;
};

function TabMenuHorizontalRoot({ value, defaultValue, onValueChange, children, ...rest }: ViewProps & {
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
    <TabContext.Provider
      value={{
        value: current,
        indicator,
        select: (v) => {
          if (value === undefined) setOwn(v);
          onValueChange?.(v);
        },
      }}
    >
      <View {...rest}>{children}</View>
    </TabContext.Provider>
  );
}

function TabMenuHorizontalList({ className, children }: { className?: string; children?: ReactNode }) {
  const { indicator } = use();
  const { list, indicator: pill } = tabMenuHorizontalVariants();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist">
      <View className={list({ class: className })}>
        {indicator.visible ? <Animated.View className={pill()} style={indicator.style} /> : null}
        {children}
      </View>
    </ScrollView>
  );
}

function TabMenuHorizontalTrigger({ value, disabled, className, children, accessibilityLabel }: {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
}) {
  const ctx = use();
  const active = ctx.value === value;
  const { trigger, label } = tabMenuHorizontalVariants({ active, disabled });
  return (
    <TriggerContext.Provider value={{ active, disabled }}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: active, disabled: !!disabled }}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onLayout={ctx.indicator.measure(value)}
        onPress={() => {
          if (active) return;
          Haptics.selectionAsync();
          ctx.select(value);
        }}
        className={trigger({ class: [!active && "active:bg-bg-soft-200", className] })}
      >
        {wrapText(children, label())}
      </Pressable>
    </TriggerContext.Provider>
  );
}

function TabMenuHorizontalIcon({ name, className }: { name: IconName; className?: string }) {
  const { icon } = tabMenuHorizontalVariants(useContext(TriggerContext));
  return <BaseIcon name={name} className={icon({ class: className })} />;
}

function TabMenuHorizontalContent({ value, forceMount, ...rest }: ViewProps & { value: string; forceMount?: boolean; className?: string }) {
  const active = use().value === value;
  if (!active && !forceMount) return null;
  return <View {...rest} style={[rest.style, !active && { display: "none" }]} />;
}

export {
  TabMenuHorizontalRoot as Root,
  TabMenuHorizontalList as List,
  TabMenuHorizontalTrigger as Trigger,
  TabMenuHorizontalIcon as Icon,
  TabMenuHorizontalContent as Content,
};
