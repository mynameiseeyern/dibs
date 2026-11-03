// AlignUI Label, ported to React Native. <Label.Root>Name <Label.Asterisk /> <Label.Sub>(optional)</Label.Sub></Label.Root>

import { createContext, useContext } from "react";
import { Text, type TextProps } from "react-native";
import { cn } from "@/utils/cn";

const Disabled = createContext(false);

function LabelRoot({ className, disabled, ...rest }: TextProps & { disabled?: boolean; className?: string }) {
  return (
    <Disabled.Provider value={!!disabled}>
      <Text className={cn("text-label-sm text-text-strong-950", disabled && "text-text-disabled-300", className)} {...rest} />
    </Disabled.Provider>
  );
}

function LabelAsterisk({ className, children, ...rest }: TextProps & { className?: string }) {
  const disabled = useContext(Disabled);
  return (
    <Text className={cn("text-primary-dark", disabled && "text-text-disabled-300", className)} {...rest}>
      {children ?? "*"}
    </Text>
  );
}

function LabelSub({ className, ...rest }: TextProps & { className?: string }) {
  const disabled = useContext(Disabled);
  return <Text className={cn("text-paragraph-sm text-text-sub-600", disabled && "text-text-disabled-300", className)} {...rest} />;
}

export { LabelRoot as Root, LabelAsterisk as Asterisk, LabelSub as Sub };
