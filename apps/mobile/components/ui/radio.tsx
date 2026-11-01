// AlignUI Radio, ported to React Native: 22px circles, violet with a white dot when picked.
// <Radio.Group value={vibe} onValueChange={setVibe}><Radio.Item value="chill" accessibilityLabel="Chill" /></Radio.Group>

import { createContext, useContext, useState, type ReactNode } from "react";
import { Pressable, View, type PressableProps, type ViewProps } from "react-native";
import * as Haptics from "expo-haptics";
import { tv } from "@/utils/tv";

export const radioVariants = tv({
  slots: {
    root: "size-[22px] items-center justify-center rounded-full border-[1.5px] border-stroke-sub-300 bg-bg-white-0",
    dot: "size-2 rounded-full bg-static-white",
  },
  variants: {
    checked: { true: { root: "scale-[1.06] border-primary-base bg-primary-base" } },
    disabled: { true: { root: "scale-100 border-stroke-soft-200 bg-bg-soft-200", dot: "bg-text-disabled-300" } },
  },
});

type Ctx = { value?: string; select: (v: string) => void; disabled?: boolean };
const RadioContext = createContext<Ctx>({ select: () => {} });

function RadioGroup({ value, defaultValue, onValueChange, disabled, className, children, ...rest }: ViewProps & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState(defaultValue);
  const current = value ?? own;
  return (
    <RadioContext.Provider
      value={{
        value: current,
        disabled,
        select: (v) => {
          if (value === undefined) setOwn(v);
          onValueChange?.(v);
        },
      }}
    >
      <View accessibilityRole="radiogroup" className={className} {...rest}>
        {children}
      </View>
    </RadioContext.Provider>
  );
}

function RadioItem({ value, disabled, className, ...rest }: Omit<PressableProps, "children" | "onPress"> & { value: string; disabled?: boolean; className?: string }) {
  const ctx = useContext(RadioContext);
  const checked = ctx.value === value;
  const off = disabled || ctx.disabled;
  const { root, dot } = radioVariants({ checked, disabled: off });
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled: !!off }}
      disabled={off}
      hitSlop={11}
      onPress={() => {
        if (checked) return;
        Haptics.selectionAsync();
        ctx.select(value);
      }}
      className={root({ class: className })}
      {...rest}
    >
      {checked ? <View className={dot()} /> : null}
    </Pressable>
  );
}

export { RadioGroup as Group, RadioItem as Item };
