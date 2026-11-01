// AlignUI AvatarGroup, ported to React Native: overlapping faces with a "+3" on the end.
// <AvatarGroup.Root size="32">{people.map(p => <Avatar.Root key={p.id} color={p.colour} name={p.display_name} />)}<AvatarGroup.Overflow>+3</AvatarGroup.Overflow></AvatarGroup.Root>

import { Children, createContext, useContext, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { AvatarGroupContext, type AvatarSize } from "./avatar";

export const avatarGroupVariants = tv({
  slots: {
    root: "flex-row self-start",
    item: "",
    overflow: "items-center justify-center rounded-full border-2 border-stroke-white-0 bg-bg-soft-200",
    overflowLabel: "text-center font-sans-bold text-text-sub-600",
  },
  variants: {
    size: {
      "80": { item: "-ml-4", overflow: "size-20", overflowLabel: "text-[22px] leading-[26px]" },
      "72": { item: "-ml-4", overflow: "size-[72px]", overflowLabel: "text-[22px] leading-[26px]" },
      "64": { item: "-ml-4", overflow: "size-16", overflowLabel: "text-[22px] leading-[26px]" },
      "56": { item: "-ml-4", overflow: "size-14", overflowLabel: "text-[22px] leading-[26px]" },
      "48": { item: "-ml-3", overflow: "size-12", overflowLabel: "text-[19px] leading-[22px]" },
      "40": { item: "-ml-2.5", overflow: "size-10", overflowLabel: "text-[16px] leading-[19px]" },
      "32": { item: "-ml-1.5", overflow: "size-8", overflowLabel: "text-[13px] leading-[16px]" },
      "24": { item: "-ml-1", overflow: "size-6", overflowLabel: "text-[10px] leading-[12px]" },
      "20": { item: "-ml-1", overflow: "size-5", overflowLabel: "text-[8px] leading-[10px]" },
    },
  },
  defaultVariants: { size: "40" },
});

type AvatarGroupVariants = VariantProps<typeof avatarGroupVariants>;
const SizeContext = createContext<AvatarGroupVariants>({});

function AvatarGroupRoot({ size = "40", className, children, ...rest }: ViewProps & AvatarGroupVariants & { className?: string; children?: ReactNode }) {
  const { root, item } = avatarGroupVariants({ size });
  return (
    <SizeContext.Provider value={{ size }}>
      <AvatarGroupContext.Provider value={{ size: size as AvatarSize }}>
        <View className={root({ class: className })} {...rest}>
          {Children.toArray(children).map((child, i) => (
            <View key={i} className={i === 0 ? undefined : item()}>
              {child}
            </View>
          ))}
        </View>
      </AvatarGroupContext.Provider>
    </SizeContext.Provider>
  );
}

function AvatarGroupOverflow({ className, children, ...rest }: ViewProps & { className?: string; children?: ReactNode }) {
  const { overflow, overflowLabel } = avatarGroupVariants(useContext(SizeContext));
  return (
    <View className={overflow({ class: className })} {...rest}>
      {wrapText(children, overflowLabel())}
    </View>
  );
}

export { AvatarGroupRoot as Root, AvatarGroupOverflow as Overflow };
