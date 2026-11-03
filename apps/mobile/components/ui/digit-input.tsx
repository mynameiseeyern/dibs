// AlignUI DigitInput, ported to React Native: one box per digit for sign-in codes. A single hidden
// TextInput takes the typing, so paste and the keyboard's one-time-code autofill both just work.
// <DigitInput.Root numInputs={6} value={code} onChange={setCode} onComplete={signIn} autoFocus />

import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputInstance } from "react-native";
import { tv } from "@/utils/tv";
import { cn } from "@/utils/cn";
import { useColour, useShadow } from "@/lib/theme";

export const digitInputVariants = tv({
  slots: {
    box: "h-16 flex-1 items-center justify-center rounded-10 border-[1.5px] border-stroke-soft-200 bg-bg-white-0",
    digit: "font-mono-medium text-[24px] leading-[30px] text-text-strong-950",
  },
  variants: {
    current: { true: { box: "border-primary-base" } },
    hasError: { true: { box: "border-error-base" } },
    disabled: { true: { box: "border-transparent bg-bg-weak-50", digit: "text-text-disabled-300" } },
  },
});

type DigitInputProps = {
  numInputs?: number;
  value: string;
  onChange: (value: string) => void;
  /** Called once every box is filled. */
  onComplete?: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  accessibilityLabel?: string;
};

function DigitInputRoot({ numInputs = 6, value, onChange, onComplete, hasError, disabled, autoFocus, className, accessibilityLabel = "Code" }: DigitInputProps) {
  const ref = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const halo = useColour(hasError ? "error-lighter" : "primary-lighter");
  const shadow = useShadow("xs");
  const at = Math.min(value.length, numInputs - 1);
  return (
    <Pressable className={cn("flex-row gap-2", className)} onPress={() => ref.current?.focus()} disabled={disabled} accessible={false}>
      {Array.from({ length: numInputs }, (_, i) => {
        const current = focused && i === at;
        const { box, digit } = digitInputVariants({ current, hasError, disabled });
        return (
          <View key={i} className={box()} style={current ? { boxShadow: `0 0 0 4px ${halo}` } : shadow}>
            <Text className={digit()}>{value[i] ?? ""}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => {
          const next = t.replace(/\D/g, "").slice(0, numInputs);
          onChange(next);
          if (next.length === numInputs) onComplete?.(next);
        }}
        maxLength={numInputs}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        accessibilityLabel={accessibilityLabel}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // Covers the boxes so a tap focuses it, but draws nothing.
        className="absolute inset-0 opacity-0"
      />
    </Pressable>
  );
}

export { DigitInputRoot as Root };
