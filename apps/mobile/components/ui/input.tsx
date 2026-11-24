// AlignUI Input, ported to React Native.
// <Input.Root hasError><Input.Wrapper><Input.Icon name="search-line" /><Input.Input placeholder="…" /></Input.Wrapper></Input.Root>
// 44px, radius-md, a 1.5px border that turns violet with a soft halo while focused.

import { createContext, useContext, useState, type ReactNode } from "react";
import { Text, TextInput, View, type TextInputProps, type ViewProps } from "react-native";
import { tv, type VariantProps } from "@/utils/tv";
import { wrapText } from "@/utils/wrap-text";
import { useColour, useShadow } from "@/lib/theme";
import { Icon as BaseIcon, type IconName } from "./icon";

export const inputVariants = tv({
  slots: {
    root: "w-full flex-row overflow-hidden border-[1.5px] border-stroke-sub-300 bg-bg-white-0",
    wrapper: "flex-1 flex-row items-center bg-bg-white-0",
    field: "flex-1 self-stretch justify-center",
    input: "flex-1 self-stretch font-sans text-[16px] text-text-strong-950",
    // Drawn by us, not iOS: a TextInput's own placeholder can come out in Times (TestFlight, Nov 2026).
    placeholder: "absolute inset-x-0 font-sans text-[16px]",
    icon: "text-[20px] leading-[20px] text-text-soft-400",
    affix: "items-center justify-center border-stroke-soft-200 bg-bg-weak-50",
    affixLabel: "text-paragraph-md text-text-sub-600",
  },
  variants: {
    size: {
      large: { root: "min-h-13 rounded-md", wrapper: "gap-2 px-4", affix: "px-4" },
      medium: { root: "min-h-11 rounded-md", wrapper: "gap-2 px-4", affix: "px-4" },
      small: { root: "min-h-9 rounded-sm", wrapper: "gap-2 px-3", input: "text-[14px]", placeholder: "text-[14px]", affix: "px-3" },
    },
    focused: { true: { root: "border-primary-base" } },
    hasError: { true: { root: "border-error-base" } },
    disabled: {
      true: { root: "border-stroke-soft-200", wrapper: "bg-bg-soft-200", input: "text-text-disabled-300", icon: "text-text-disabled-300" },
    },
  },
  defaultVariants: { size: "medium" },
});

type InputVariants = VariantProps<typeof inputVariants>;
type Ctx = InputVariants & { setFocused: (f: boolean) => void };
const InputContext = createContext<Ctx>({ setFocused: () => {} });

function InputRoot({ size, hasError, disabled, className, children, style, ...rest }: ViewProps & Omit<InputVariants, "focused"> & { className?: string; children?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  const { root } = inputVariants({ size, hasError, disabled, focused });
  const errorHalo = useColour("error-lighter");
  const halo = useColour("primary-lighter");
  const shadow = useShadow("xs");
  const ring = focused && !disabled ? { boxShadow: `0 0 0 4px ${hasError ? errorHalo : halo}` } : shadow;
  return (
    <InputContext.Provider value={{ size, hasError, disabled, focused, setFocused }}>
      <View className={root({ class: className })} style={[ring, style]} {...rest}>
        {children}
      </View>
    </InputContext.Provider>
  );
}

function InputWrapper({ className, ...rest }: ViewProps & { className?: string }) {
  const { wrapper } = inputVariants(useContext(InputContext));
  return <View className={wrapper({ class: className })} {...rest} />;
}

function InputInput({ className, onFocus, onBlur, onChangeText, placeholder, ...rest }: TextInputProps & { className?: string }) {
  const ctx = useContext(InputContext);
  const { field, input, placeholder: placeholderClass } = inputVariants(ctx);
  const hint = useColour(ctx.disabled ? "text-disabled-300" : "text-soft-400");
  const caret = useColour("primary-base");
  const [typed, setTyped] = useState(rest.defaultValue ?? "");
  const empty = (rest.value ?? typed) === "";
  return (
    <View className={field()}>
      {placeholder && empty ? (
        <Text
          numberOfLines={1}
          className={placeholderClass()}
          style={{ color: hint }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
        >
          {placeholder}
        </Text>
      ) : null}
      <TextInput
        editable={!ctx.disabled}
        // Kept for screen readers, but invisible: the Text above is what people see.
        placeholder={placeholder}
        placeholderTextColor="transparent"
        selectionColor={caret}
        className={input({ class: className })}
        onChangeText={(t) => {
          setTyped(t);
          onChangeText?.(t);
        }}
        onFocus={(e) => {
          ctx.setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          ctx.setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
    </View>
  );
}

function InputIcon({ name, className }: { name: IconName; className?: string }) {
  const { icon } = inputVariants(useContext(InputContext));
  return <BaseIcon name={name} className={icon({ class: className })} />;
}

/** A fixed bit of text or a control before or after the field ("https://", "AUD"). */
function InputAffix({ className, children, side = "start", ...rest }: ViewProps & { className?: string; side?: "start" | "end"; children?: ReactNode }) {
  const { affix, affixLabel } = inputVariants(useContext(InputContext));
  return (
    <View className={affix({ class: [side === "start" ? "border-r" : "border-l", className] })} {...rest}>
      {wrapText(children, affixLabel())}
    </View>
  );
}

export { InputRoot as Root, InputWrapper as Wrapper, InputInput as Input, InputIcon as Icon, InputAffix as Affix };
