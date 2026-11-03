// AlignUI Tag, ported to React Native: small labelled chips ("Surry Hills", "Under $30"), optionally dismissable.
// <Tag.Root variant="gray"><Tag.Icon name="map-pin-line" />Surry Hills<Tag.DismissButton onPress={…} /></Tag.Root>

import { createContext, useContext, type ReactNode } from "react";
import { Pressable, View, type ViewProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { Icon as BaseIcon, type IconName } from "./icon";

export const tagVariants = tv({
  slots: {
    root: "h-6 flex-row items-center gap-2 self-start rounded-md border px-2",
    label: "text-label-xs text-text-sub-600",
    icon: "-mx-1 text-[16px] leading-[16px] text-text-soft-400",
    dismissIcon: "text-[16px] leading-[16px] text-text-soft-400",
  },
  variants: {
    variant: {
      stroke: { root: "border-stroke-soft-200 bg-bg-white-0 active:border-transparent active:bg-bg-weak-50" },
      gray: { root: "border-transparent bg-bg-weak-50" },
    },
    disabled: {
      true: { root: "border-transparent bg-bg-weak-50", label: "text-text-disabled-300", icon: "text-text-disabled-300", dismissIcon: "text-text-disabled-300" },
    },
  },
  defaultVariants: { variant: "stroke" },
});

type TagVariants = VariantProps<typeof tagVariants>;
const TagContext = createContext<TagVariants>({});

function TagRoot({ variant, disabled, className, children, ...rest }: ViewProps & TagVariants & { className?: string; children?: ReactNode }) {
  const shared = { variant, disabled };
  const { root, label } = tagVariants(shared);
  return (
    <TagContext.Provider value={shared}>
      <View className={root({ class: className })} {...rest}>
        {wrapText(children, label())}
      </View>
    </TagContext.Provider>
  );
}

function TagIcon({ name, className }: { name: IconName; className?: string }) {
  const { icon } = tagVariants(useContext(TagContext));
  return <BaseIcon name={name} className={icon({ class: className })} />;
}

/** The little × on the end. hitSlop takes the tap area to 44px. */
function TagDismissButton({ onPress, className, accessibilityLabel = "Remove" }: { onPress?: () => void; className?: string; accessibilityLabel?: string }) {
  const ctx = useContext(TagContext);
  const { dismissIcon } = tagVariants(ctx);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} disabled={!!ctx.disabled} hitSlop={14} onPress={onPress} className="-ml-1.5 -mr-1">
      <BaseIcon name="close-line" className={dismissIcon({ class: className })} />
    </Pressable>
  );
}

export { TagRoot as Root, TagIcon as Icon, TagDismissButton as DismissButton };
