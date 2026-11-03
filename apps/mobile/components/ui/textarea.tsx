// AlignUI Textarea, ported to React Native and styled like Input: radius-md, a 1.5px border that
// turns violet with a soft halo while focused, and an optional character counter in the corner.
// <Textarea.Root value={note} onChangeText={setNote} maxLength={500} placeholder="What to bring…">
//   <Textarea.CharCounter current={note.length} max={500} />
// </Textarea.Root>

import { useState, type ReactNode } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { tv } from "@/utils/tv";
import { useColour, useShadow } from "@/lib/theme";

export const textareaVariants = tv({
  slots: {
    root: "w-full rounded-md border-[1.5px] border-stroke-sub-300 bg-bg-white-0 pb-2.5",
    input: "min-h-[82px] px-3 pt-2.5 font-sans text-[16px] leading-[24px] text-text-strong-950",
    counter: "self-end px-3 text-label-xs text-text-soft-400",
  },
  variants: {
    focused: { true: { root: "border-primary-base" } },
    hasError: { true: { root: "border-error-base" } },
    disabled: { true: { root: "border-stroke-soft-200 bg-bg-soft-200", input: "text-text-disabled-300", counter: "text-text-disabled-300" } },
  },
});

type TextareaProps = TextInputProps & {
  hasError?: boolean;
  disabled?: boolean;
  /** Visible lines before it scrolls (the web's `rows`). */
  rows?: number;
  className?: string;
  inputClassName?: string;
  children?: ReactNode;
};

function TextareaRoot({ hasError, disabled, rows = 3, className, inputClassName, children, onFocus, onBlur, style, ...rest }: TextareaProps) {
  const [focused, setFocused] = useState(false);
  const { root, input } = textareaVariants({ focused, hasError, disabled });
  const halo = useColour(hasError ? "error-lighter" : "primary-lighter");
  const placeholder = useColour(disabled ? "text-disabled-300" : "text-soft-400");
  const caret = useColour("primary-base");
  const shadow = useShadow("xs");
  return (
    <View className={root({ class: className })} style={[focused && !disabled ? { boxShadow: `0 0 0 4px ${halo}` } : shadow, style]}>
      <TextInput
        multiline
        textAlignVertical="top"
        editable={!disabled}
        placeholderTextColor={placeholder}
        selectionColor={caret}
        className={input({ class: inputClassName })}
        style={{ minHeight: Math.max(82, rows * 24 + 10) }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {children}
    </View>
  );
}

/** "120/500", turning red past the limit. */
function TextareaCharCounter({ current = 0, max, className }: { current?: number; max?: number; className?: string }) {
  const { counter } = textareaVariants();
  if (max === undefined) return null;
  return (
    <Text className={counter({ class: [current > max && "text-error-base", className] })} accessibilityLabel={`${current} of ${max} characters`}>
      {current}/{max}
    </Text>
  );
}

export { TextareaRoot as Root, TextareaCharCounter as CharCounter };
