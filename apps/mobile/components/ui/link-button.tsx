// AlignUI LinkButton, ported to React Native: a text-only action ("See who's in ›").
// <LinkButton.Root variant="primary" onPress={…}>See who's in<LinkButton.Icon name="arrow-right-s-line" /></LinkButton.Root>

import { createContext, useContext, type ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { Icon as BaseIcon, type IconName } from "./icon";

export const linkButtonVariants = tv({
  slots: {
    root: "flex-row items-center justify-center self-start active:opacity-60",
    label: "",
    icon: "",
  },
  variants: {
    variant: {
      gray: { label: "text-text-sub-600", icon: "text-text-sub-600" },
      black: { label: "text-text-strong-950", icon: "text-text-strong-950" },
      primary: { label: "text-primary-base", icon: "text-primary-base" },
      error: { label: "text-error-base", icon: "text-error-base" },
      modifiable: {},
    },
    size: {
      medium: { root: "h-5 gap-1", label: "text-label-sm", icon: "text-[20px] leading-[20px]" },
      small: { root: "h-4 gap-1", label: "text-label-xs", icon: "text-[16px] leading-[16px]" },
    },
    underline: { true: { label: "underline" } },
    disabled: { true: {} },
  },
  compoundVariants: [{ disabled: true, class: { root: "active:opacity-100", label: "text-text-disabled-300 no-underline", icon: "text-text-disabled-300" } }],
  defaultVariants: { variant: "gray", size: "medium" },
});

type LinkButtonVariants = VariantProps<typeof linkButtonVariants>;
const LinkButtonContext = createContext<LinkButtonVariants>({});

type LinkButtonRootProps = Omit<PressableProps, "children"> & Omit<LinkButtonVariants, "disabled"> & { className?: string; children?: ReactNode };

/** The text is short, so hitSlop takes the tap area to 44px tall. */
function LinkButtonRoot({ variant, size, underline, disabled, className, children, ...rest }: LinkButtonRootProps) {
  const shared = { variant, size, underline, disabled: !!disabled };
  const { root, label } = linkButtonVariants(shared);
  return (
    <LinkButtonContext.Provider value={shared}>
      <Pressable accessibilityRole="link" disabled={disabled} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} className={root({ class: className })} {...rest}>
        {wrapText(children, label())}
      </Pressable>
    </LinkButtonContext.Provider>
  );
}

function LinkButtonIcon({ name, className }: { name: IconName; className?: string }) {
  const { icon } = linkButtonVariants(useContext(LinkButtonContext));
  return <BaseIcon name={name} className={icon({ class: className })} />;
}

export { LinkButtonRoot as Root, LinkButtonIcon as Icon };
