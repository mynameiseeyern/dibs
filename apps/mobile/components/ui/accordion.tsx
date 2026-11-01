// AlignUI Accordion, ported to React Native.
// <Accordion.Root type="single" collapsible><Accordion.Item value="a"><Accordion.Trigger>Who sees my address?<Accordion.Arrow /></Accordion.Trigger>
//   <Accordion.Content>Only people in the plan.</Accordion.Content></Accordion.Item></Accordion.Root>

import { createContext, useContext, useState, type ReactNode } from "react";
import { LayoutAnimation, Platform, Pressable, UIManager, View, type ViewProps } from "react-native";
import { cn } from "@/utils/cn";
import { wrapText } from "@/utils/wrap-text";
import { Icon as BaseIcon, type IconName } from "./icon";

if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental?.(true);

type RootState = { isOpen: (v: string) => boolean; toggle: (v: string) => void };
const RootContext = createContext<RootState>({ isOpen: () => false, toggle: () => {} });
const ItemContext = createContext<{ value: string; open: boolean; disabled?: boolean }>({ value: "", open: false });

type SingleProps = { type: "single"; value?: string; defaultValue?: string; onValueChange?: (v: string) => void; collapsible?: boolean };
type MultipleProps = { type: "multiple"; value?: string[]; defaultValue?: string[]; onValueChange?: (v: string[]) => void };
type RootProps = (SingleProps | MultipleProps) & ViewProps & { className?: string; children?: ReactNode };

function AccordionRoot(props: RootProps) {
  const { className, children, type } = props;
  const [inner, setInner] = useState<string[]>(() => {
    const d = props.defaultValue;
    return d === undefined ? [] : Array.isArray(d) ? d : [d];
  });
  const controlled = props.value !== undefined;
  const open = controlled ? (Array.isArray(props.value) ? props.value : props.value ? [props.value] : []) : inner;

  const toggle = (v: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, "easeInEaseOut", "opacity"));
    let next: string[];
    if (type === "single") {
      const collapsible = (props as SingleProps).collapsible;
      next = open.includes(v) ? (collapsible ? [] : open) : [v];
      if (!controlled) setInner(next);
      (props as SingleProps).onValueChange?.(next[0] ?? "");
    } else {
      next = open.includes(v) ? open.filter((x) => x !== v) : [...open, v];
      if (!controlled) setInner(next);
      (props as MultipleProps).onValueChange?.(next);
    }
  };

  return (
    <RootContext.Provider value={{ isOpen: (v) => open.includes(v), toggle }}>
      <View className={cn("gap-2", className)}>{children}</View>
    </RootContext.Provider>
  );
}

function AccordionItem({ value, disabled, className, children }: { value: string; disabled?: boolean; className?: string; children?: ReactNode }) {
  const open = useContext(RootContext).isOpen(value);
  return (
    <ItemContext.Provider value={{ value, open, disabled }}>
      <View className={cn("rounded-10 border border-stroke-soft-200 bg-bg-white-0", open && "border-transparent bg-bg-weak-50", className)}>{children}</View>
    </ItemContext.Provider>
  );
}

function AccordionTrigger({ className, children }: { className?: string; children?: ReactNode }) {
  const { toggle } = useContext(RootContext);
  const { value, open, disabled } = useContext(ItemContext);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => toggle(value)}
      className={cn("min-h-11 flex-row items-center gap-2.5 p-3.5", className)}
    >
      {wrapText(children, "flex-1 text-label-sm text-text-strong-950")}
    </Pressable>
  );
}

/** A leading icon in the trigger. */
function AccordionIcon({ name, className }: { name: IconName; className?: string }) {
  return <BaseIcon name={name} className={cn("text-text-sub-600", className)} />;
}

/** Plus while shut, minus while open, like the web. */
function AccordionArrow({ className, openIcon = "add-line", closeIcon = "subtract-line" }: { className?: string; openIcon?: IconName; closeIcon?: IconName }) {
  const { open } = useContext(ItemContext);
  return <BaseIcon name={open ? closeIcon : openIcon} className={cn(open ? "text-text-sub-600" : "text-text-soft-400", className)} />;
}

function AccordionContent({ className, children }: { className?: string; children?: ReactNode }) {
  const { open } = useContext(ItemContext);
  if (!open) return null;
  return <View className={cn("-mt-2 px-3.5 pb-3.5", className)}>{wrapText(children, "text-paragraph-sm text-text-sub-600")}</View>;
}

export {
  AccordionRoot as Root,
  AccordionItem as Item,
  AccordionTrigger as Trigger,
  AccordionIcon as Icon,
  AccordionArrow as Arrow,
  AccordionContent as Content,
};
