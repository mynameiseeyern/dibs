// AlignUI Select, ported to React Native. The trigger looks like the Input; the options open in a
// bottom sheet list with a check on the chosen one.
// <Select.Root value onValueChange><Select.Trigger><Select.TriggerIcon name="time-line" /><Select.Value placeholder="Pick a time" /></Select.Trigger>
//   <Select.Content><Select.Item value="19:00">7pm</Select.Item>…</Select.Content></Select.Root>

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { cn } from "@/utils/cn";
import { useShadow } from "@/lib/theme";
import { Icon, type IconName } from "./icon";
import { SheetFrame, useControllableOpen } from "./sheet";

export const selectVariants = tv({
  slots: {
    trigger: "w-full flex-row items-center gap-2 rounded-md border-[1.5px] border-stroke-sub-300 bg-bg-white-0 px-4 active:bg-bg-weak-50",
    value: "flex-1 text-paragraph-md text-text-strong-950",
    arrow: "text-[20px] leading-[20px] text-text-sub-600",
    triggerIcon: "text-[20px] leading-[20px] text-text-sub-600",
    item: "min-h-12 flex-row items-center gap-3 rounded-lg px-3 active:bg-bg-weak-50",
    itemLabel: "flex-1 text-paragraph-md text-text-strong-950",
    itemIcon: "text-[20px] leading-[20px] text-text-sub-600",
  },
  variants: {
    size: {
      medium: { trigger: "min-h-11" },
      small: { trigger: "min-h-9 rounded-sm px-3", value: "text-paragraph-sm" },
      xsmall: { trigger: "min-h-8 rounded-sm px-2.5", value: "text-paragraph-sm" },
    },
    placeholder: { true: { value: "text-text-soft-400", triggerIcon: "text-text-soft-400" } },
    hasError: { true: { trigger: "border-error-base" } },
    disabled: {
      true: { trigger: "border-stroke-soft-200 bg-bg-soft-200", value: "text-text-disabled-300", arrow: "text-text-disabled-300", triggerIcon: "text-text-disabled-300" },
    },
    selected: { true: { item: "bg-primary-lighter", itemLabel: "text-label-md text-primary-dark" } },
  },
  defaultVariants: { size: "medium" },
});

type Size = VariantProps<typeof selectVariants>["size"];

type SelectState = {
  value?: string;
  choose: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  size: Size;
  hasError?: boolean;
  disabled?: boolean;
  labels: Record<string, ReactNode>;
  register: (value: string, label: ReactNode) => void;
};
const SelectContext = createContext<SelectState | null>(null);
function useSelect() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select parts go inside <Select.Root>.");
  return ctx;
}

type RootProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: Size;
  hasError?: boolean;
  disabled?: boolean;
  /** Accepted for the web's API; compact variants look the same on a phone. */
  variant?: "default" | "compact" | "compactForInput";
  children?: ReactNode;
};

function SelectRoot({ value, defaultValue, onValueChange, open, defaultOpen, onOpenChange, size = "medium", hasError, disabled, children }: RootProps) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [isOpen, setOpen] = useControllableOpen(open, defaultOpen, onOpenChange);
  const [labels, setLabels] = useState<Record<string, ReactNode>>({});
  const register = useCallback((v: string, label: ReactNode) => setLabels((l) => (l[v] === label ? l : { ...l, [v]: label })), []);
  const choose = (v: string) => {
    if (value === undefined) setInner(v);
    onValueChange?.(v);
    setOpen(false);
  };
  return (
    <SelectContext.Provider value={{ value: current, choose, open: isOpen, setOpen, size, hasError, disabled, labels, register }}>{children}</SelectContext.Provider>
  );
}

const TriggerContext = createContext({ placeholder: false });

function SelectTrigger({ className, children, accessibilityLabel }: { className?: string; children?: ReactNode; id?: string; accessibilityLabel?: string }) {
  const { value, setOpen, size, hasError, disabled, open } = useSelect();
  const placeholder = !value;
  const { trigger, arrow } = selectVariants({ size, hasError, disabled, placeholder });
  const shadow = useShadow(disabled ? null : "xs");
  return (
    <TriggerContext.Provider value={{ placeholder }}>
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={trigger({ class: className })}
        style={shadow}
      >
        {children}
        <Icon name="arrow-down-s-line" className={arrow()} />
      </Pressable>
    </TriggerContext.Provider>
  );
}

function SelectTriggerIcon({ name, className }: { name: IconName; className?: string }) {
  const { size, disabled } = useSelect();
  const { placeholder } = useContext(TriggerContext);
  const { triggerIcon } = selectVariants({ size, disabled, placeholder });
  return <Icon name={name} className={triggerIcon({ class: className })} />;
}

/** The chosen option's label, or the placeholder. */
function SelectValue({ placeholder, className }: { placeholder?: string; className?: string }) {
  const { value, labels, size, disabled } = useSelect();
  const label = value ? (labels[value] ?? value) : placeholder;
  const { value: valueClass } = selectVariants({ size, disabled, placeholder: !value });
  return (
    <Text numberOfLines={1} className={valueClass({ class: className })}>
      {label}
    </Text>
  );
}

// Items render inside the sheet only while it's open. While it's shut, they still mount (rendering
// nothing) so Select.Value knows each option's label.
const CollectingContext = createContext(false);

function SelectContent({ className, children, title }: { className?: string; children?: ReactNode; title?: string }) {
  const { open, setOpen } = useSelect();
  return (
    <>
      <CollectingContext.Provider value>{children}</CollectingContext.Provider>
      <SheetFrame open={open} onClose={() => setOpen(false)} className={cn("max-h-[70%] px-2", className)}>
        {title ? <Text className="px-3 text-label-lg text-text-strong-950">{title}</Text> : null}
        <ScrollView contentContainerClassName="gap-1">{children}</ScrollView>
      </SheetFrame>
    </>
  );
}

const ItemContext = createContext(false);

function SelectItem({ value, className, children, disabled }: { value: string; className?: string; children?: ReactNode; disabled?: boolean }) {
  const { value: current, choose, register } = useSelect();
  const collecting = useContext(CollectingContext);
  const latest = useRef(children);
  latest.current = children;
  useEffect(() => {
    if (collecting) register(value, latest.current);
  }, [collecting, register, value, children]);
  if (collecting) return null;

  const selected = current === value;
  const { item, itemLabel } = selectVariants({ selected });
  return (
    <ItemContext.Provider value={selected}>
      <Pressable
        accessibilityRole="menuitem"
        accessibilityState={{ selected, disabled: !!disabled }}
        disabled={disabled}
        onPress={() => choose(value)}
        className={cn(item({ class: className }), disabled && "opacity-50")}
      >
        {typeof children === "string" || typeof children === "number" ? <Text className={itemLabel()}>{children}</Text> : <View className="flex-1 flex-row items-center gap-3">{children}</View>}
        {selected ? <Icon name="check-line" className="text-primary-dark" /> : null}
      </Pressable>
    </ItemContext.Provider>
  );
}

function SelectItemIcon({ name, className }: { name: IconName; className?: string }) {
  const { itemIcon } = selectVariants({ selected: useContext(ItemContext) });
  return <Icon name={name} className={itemIcon({ class: className })} />;
}

function SelectGroupLabel({ className, children }: { className?: string; children?: ReactNode }) {
  if (useContext(CollectingContext)) return null;
  return <Text className={cn("px-3 py-1 text-subheading-xs uppercase text-text-soft-400", className)}>{children}</Text>;
}

function SelectSeparator({ className }: { className?: string }) {
  if (useContext(CollectingContext)) return null;
  return <View className={cn("mx-3 my-1 h-px bg-stroke-soft-200", className)} />;
}

const SelectGroup = ({ children }: { children?: ReactNode }) => <>{children}</>;

export {
  SelectRoot as Root,
  SelectTrigger as Trigger,
  SelectTriggerIcon as TriggerIcon,
  SelectValue as Value,
  SelectContent as Content,
  SelectItem as Item,
  SelectItemIcon as ItemIcon,
  SelectGroup as Group,
  SelectGroupLabel as GroupLabel,
  SelectSeparator as Separator,
};
