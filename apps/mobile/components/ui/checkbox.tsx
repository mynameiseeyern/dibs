// AlignUI Checkbox, ported to React Native: 22px, a 1.5px border, violet with a white tick when
// checked. A choice inside a form (a setting that applies straight away is a Switch).
// <Checkbox.Root checked={came} onCheckedChange={setCame} accessibilityLabel="Sam came" />

import { useState } from "react";
import { Pressable, type PressableProps } from "react-native";
import * as Haptics from "expo-haptics";
import { tv } from "@/utils/tv";
import { Icon } from "./icon";

export type CheckedState = boolean | "indeterminate";

export const checkboxVariants = tv({
  slots: {
    root: "size-[22px] items-center justify-center rounded-xs border-[1.5px] border-stroke-sub-300 bg-bg-white-0",
    mark: "text-[16px] leading-[16px] text-static-white",
  },
  variants: {
    checked: { true: { root: "scale-[1.06] border-primary-base bg-primary-base" } },
    disabled: { true: { root: "border-stroke-soft-200 bg-bg-soft-200", mark: "text-text-disabled-300" } },
    hasError: { true: { root: "border-error-base" } },
  },
  compoundVariants: [{ checked: true, disabled: true, class: { root: "scale-100 border-stroke-soft-200 bg-bg-soft-200" } }],
});

type CheckboxProps = Omit<PressableProps, "children" | "onPress"> & {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
};

function CheckboxRoot({ checked, defaultChecked, onCheckedChange, disabled, hasError, className, ...rest }: CheckboxProps) {
  const [own, setOwn] = useState<CheckedState>(defaultChecked ?? false);
  const state = checked ?? own;
  const on = state !== false;
  const { root, mark } = checkboxVariants({ checked: on, disabled, hasError });
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state === "indeterminate" ? "mixed" : state, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={11}
      onPress={() => {
        Haptics.selectionAsync();
        const next = state !== true;
        if (checked === undefined) setOwn(next);
        onCheckedChange?.(next);
      }}
      className={root({ class: className })}
      {...rest}
    >
      {on ? <Icon name={state === "indeterminate" ? "subtract-line" : "check-line"} className={mark()} /> : null}
    </Pressable>
  );
}

export { CheckboxRoot as Root };
