// A date and time field for the native app: looks like Input, and opens the platform picker.
// iOS: the inline calendar (or the time wheel) in a bottom sheet with a Done button.
// Android: the system date dialog, then the time dialog for mode="datetime".
//
// Shape: `value` and `onChange` are Dates (instants). The picker and the label both show Sydney
// wall-clock time, like the web's DateTime.tsx, whatever time zone the phone is in. To send a plan
// start to the API, use `date.toISOString()`.
//
// <Datepicker.Root mode="datetime" value={start} onChange={setStart} placeholder="Pick a day" minimumDate={new Date()} />

import { useState, type ReactNode } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { tv } from "@/utils/tv";
import { ThemeScope, useColour, useMode, useShadow } from "@/lib/theme";
import * as Button from "./button";
import { Icon } from "./icon";

export const TZ = "Australia/Sydney";

export const datepickerVariants = tv({
  slots: {
    field:
      "min-h-11 w-full flex-row items-center gap-2 rounded-md border-[1.5px] border-stroke-sub-300 bg-bg-white-0 px-4",
    value: "flex-1 text-paragraph-md text-text-strong-950",
    icon: "text-[20px] leading-[20px] text-text-soft-400",
    sheet: "gap-4 rounded-t-xl bg-bg-white-0 px-4 pt-4",
  },
  variants: {
    open: { true: { field: "border-primary-base" } },
    empty: { true: { value: "text-text-soft-400" } },
    hasError: { true: { field: "border-error-base" } },
    disabled: {
      true: {
        field: "border-stroke-soft-200 bg-bg-soft-200",
        value: "text-text-disabled-300",
        icon: "text-text-disabled-300",
      },
    },
  },
});

type Mode = "date" | "time" | "datetime";

/** "Fri 7 Nov", "7:30pm" or "Fri 7 Nov, 7:30pm", in Sydney time. */
export function formatPicked(d: Date, mode: Mode): string {
  const day = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  })
    .format(d)
    .replace(/\s/g, "")
    .toLowerCase();
  return mode === "date" ? day : mode === "time" ? time : `${day}, ${time}`;
}

type DatepickerProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  mode?: Mode;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Minutes between times on the wheel/dial (iOS and Android). */
  minuteInterval?: 1 | 5 | 10 | 15 | 30;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  accessibilityLabel?: string;
  /** Draw your own trigger (the day strip's "More" tile) instead of the field. */
  renderTrigger?: (open: () => void) => ReactNode;
};

function DatepickerRoot({
  value,
  onChange,
  mode = "date",
  placeholder = "Pick a day",
  minimumDate,
  maximumDate,
  minuteInterval = 5,
  disabled,
  hasError,
  className,
  accessibilityLabel,
  renderTrigger,
}: DatepickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const accent = useColour("primary-base");
  const scheme = useMode();
  const shadow = useShadow(open ? null : "xs");
  const {
    field,
    value: valueText,
    icon,
    sheet,
  } = datepickerVariants({ open, empty: !value, hasError, disabled });

  const openPicker = () => {
    const start = value ?? minimumDate ?? new Date();
    if (Platform.OS === "android") {
      const common = {
        minimumDate,
        maximumDate,
        timeZoneName: TZ,
        minuteInterval,
      } as const;
      const pickTime = (day: Date) =>
        DateTimePickerAndroid.open({
          ...common,
          value: day,
          mode: "time",
          onChange: (e, t) => e.type === "set" && t && onChange(t),
        });
      DateTimePickerAndroid.open({
        ...common,
        value: start,
        mode: mode === "time" ? "time" : "date",
        onChange: (e, d) => {
          if (e.type !== "set" || !d) return;
          if (mode === "datetime") pickTime(d);
          else onChange(d);
        },
      });
      return;
    }
    setDraft(start);
    setOpen(true);
  };

  return (
    <>
      {renderTrigger ? renderTrigger(openPicker) : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{
          text: value ? formatPicked(value, mode) : placeholder,
        }}
        disabled={disabled}
        onPress={openPicker}
        className={field({ class: className })}
        style={shadow}
      >
        <Icon
          name={mode === "time" ? "time-line" : "calendar-line"}
          className={icon()}
        />
        <Text className={valueText()} numberOfLines={1}>
          {value ? formatPicked(value, mode) : placeholder}
        </Text>
        <Icon name="arrow-down-s-line" className={icon()} />
      </Pressable>
      )}

      {Platform.OS === "ios" ? (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <ThemeScope>
            <Pressable
              className="flex-1 bg-overlay"
              onPress={() => setOpen(false)}
              accessibilityLabel="Close"
            />
            <SafeAreaView edges={["bottom"]} className={sheet()}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display={mode === "time" ? "spinner" : "inline"}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                minuteInterval={minuteInterval}
                timeZoneName={TZ}
                accentColor={accent}
                themeVariant={scheme}
                onChange={(_, d) => d && setDraft(d)}
              />
              <Button.Root
                size="large"
                block
                onPress={() => {
                  onChange(draft);
                  setOpen(false);
                }}
              >
                Done
              </Button.Root>
            </SafeAreaView>
          </ThemeScope>
        </Modal>
      ) : null}
    </>
  );
}

export { DatepickerRoot as Root };
