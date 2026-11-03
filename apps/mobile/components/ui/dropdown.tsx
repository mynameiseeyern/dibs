// AlignUI Dropdown, ported to React Native as an action sheet: a short list of things to do, from the bottom.
// <Dropdown.Root><Dropdown.Trigger><Button.Root iconOnly>…</Button.Root></Dropdown.Trigger>
//   <Dropdown.Content><Dropdown.Label>Plan</Dropdown.Label>
//   <Dropdown.Item onSelect={…}><Dropdown.ItemIcon name="pencil-line" />Edit plan</Dropdown.Item>
//   <Dropdown.Separator /><Dropdown.Item destructive>Call it off</Dropdown.Item></Dropdown.Content></Dropdown.Root>

import { createContext, useContext, type ReactNode } from "react";
import { Pressable, Text, View, type ViewProps } from "react-native";
import { tv } from "@/utils/tv";
import { cn } from "@/utils/cn";
import { wrapText } from "@/utils/wrap-text";
import { Icon, type IconName } from "./icon";
import { SheetFrame, SheetRoot, SheetTrigger, useSheet } from "./sheet";

export const dropdownVariants = tv({
  slots: {
    item: "min-h-12 flex-row items-center gap-3 rounded-lg px-3 active:bg-bg-weak-50",
    label: "flex-1 text-paragraph-md text-text-strong-950",
    icon: "text-[20px] leading-[20px] text-text-sub-600",
  },
  variants: {
    destructive: { true: { label: "text-error-dark", icon: "text-error-dark" } },
    disabled: { true: { label: "text-text-disabled-300", icon: "text-text-disabled-300" } },
  },
});

const DropdownRoot = SheetRoot;
const DropdownTrigger = SheetTrigger;

function DropdownContent({ className, children }: { className?: string; children?: ReactNode; align?: string; side?: string; sideOffset?: number }) {
  const { open, setOpen } = useSheet();
  return (
    <SheetFrame open={open} onClose={() => setOpen(false)} className={cn("gap-1 px-2", className)}>
      {children}
    </SheetFrame>
  );
}

const ItemContext = createContext<{ destructive?: boolean; disabled?: boolean }>({});

type ItemProps = {
  onSelect?: () => void;
  disabled?: boolean;
  /** The red "Take it off the vote" style. The web does this with className="text-error-base". */
  destructive?: boolean;
  /** Keep the sheet open after choosing (Radix's event.preventDefault() in onSelect). */
  keepOpen?: boolean;
  className?: string;
  children?: ReactNode;
};

function DropdownItem({ onSelect, disabled, destructive, keepOpen, className, children }: ItemProps) {
  const { setOpen } = useSheet();
  const { item, label } = dropdownVariants({ destructive, disabled });
  return (
    <ItemContext.Provider value={{ destructive, disabled }}>
      <Pressable
        accessibilityRole="menuitem"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={() => {
          if (!keepOpen) setOpen(false);
          onSelect?.();
        }}
        className={item({ class: className })}
      >
        {wrapText(children, label())}
      </Pressable>
    </ItemContext.Provider>
  );
}

function DropdownItemIcon({ name, className }: { name: IconName; className?: string }) {
  const { icon } = dropdownVariants(useContext(ItemContext));
  return <Icon name={name} className={icon({ class: className })} />;
}

function DropdownGroup({ className, ...rest }: ViewProps & { className?: string }) {
  return <View className={cn("gap-1", className)} {...rest} />;
}

function DropdownLabel({ className, children }: { className?: string; children?: ReactNode }) {
  return <Text className={cn("px-3 py-1 text-subheading-xs uppercase text-text-soft-400", className)}>{children}</Text>;
}

function DropdownSeparator({ className }: { className?: string }) {
  return <View className={cn("mx-3 my-1 h-px bg-stroke-soft-200", className)} />;
}

export {
  DropdownRoot as Root,
  DropdownTrigger as Trigger,
  DropdownContent as Content,
  DropdownItem as Item,
  DropdownItemIcon as ItemIcon,
  DropdownGroup as Group,
  DropdownLabel as Label,
  DropdownSeparator as Separator,
};
