// AlignUI Hint, ported to React Native. <Hint.Root hasError><Hint.Icon name="error-warning-fill" />Message</Hint.Root>

import { createContext, useContext, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { Icon as BaseIcon, type IconName } from "./icon";

export const hintVariants = tv({
  slots: {
    root: "flex-row items-center gap-1",
    label: "shrink text-paragraph-sm text-text-sub-600",
    icon: "text-[16px] leading-[16px] text-text-soft-400",
  },
  variants: {
    disabled: { true: { label: "text-text-disabled-300", icon: "text-text-disabled-300" } },
    hasError: { true: { label: "text-error-dark", icon: "text-error-dark" } },
  },
});

type HintVariants = VariantProps<typeof hintVariants>;
const HintContext = createContext<HintVariants>({});

function HintRoot({ hasError, disabled, className, children, ...rest }: ViewProps & HintVariants & { className?: string; children?: ReactNode }) {
  const { root, label } = hintVariants({ hasError, disabled });
  return (
    <HintContext.Provider value={{ hasError, disabled }}>
      <View className={root({ class: className })} {...rest}>
        {wrapText(children, label())}
      </View>
    </HintContext.Provider>
  );
}

function HintIcon({ name, className }: { name: IconName; className?: string }) {
  const { icon } = hintVariants(useContext(HintContext));
  return <BaseIcon name={name} className={icon({ class: className })} />;
}

export { HintRoot as Root, HintIcon as Icon };
