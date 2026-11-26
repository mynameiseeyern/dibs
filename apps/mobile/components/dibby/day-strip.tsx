// The web's DayStrip (apps/web/components/DateTime.tsx): three weeks of days in a row you swipe,
// weekday over the date, violet when picked, and More for anything further out.

import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import * as Datepicker from "@/components/ui/datepicker";
import { Icon } from "@/components/ui/icon";
import { addDays, sydneyToday } from "@/lib/dates";
import { monthName, sydneyInstant } from "@/lib/when-words";
import { sydneyDate } from "@dibs/shared/when";
import { cn } from "@/utils/cn";

const STRIP_DAYS = 21;
const TILE = 48;
const GAP = 4;

const weekday = (ymd: string) => new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short" }).format(new Date(`${ymd}T00:00:00Z`));
const monthShort = (ymd: string) => new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", month: "short" }).format(new Date(`${ymd}T00:00:00Z`));
const longDay = (ymd: string) => new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${ymd}T00:00:00Z`));

export function DayStrip({ value, onChange, label = "Day" }: { value: string | null; onChange: (ymd: string | null) => void; label?: string }) {
  const today = useMemo(() => sydneyToday(), []);
  const days = useMemo(() => Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, i)), [today]);
  const later = value && !days.includes(value) ? value : null;
  const row = useRef<ComponentRef<typeof ScrollView>>(null);

  // Keep the picked day in view.
  useEffect(() => {
    const i = value ? days.indexOf(value) : -1;
    if (i > 3) row.current?.scrollTo({ x: (i - 3) * (TILE + GAP), animated: true });
  }, [value, days]);

  const first = monthName(days[0]);
  const last = monthName(later ?? days[days.length - 1]);
  const tap = (d: string) => {
    Haptics.selectionAsync();
    onChange(value === d ? null : d);
  };
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-2">
        <Text className="text-label-sm text-text-strong-950">{label}</Text>
        <Text className="text-paragraph-xs text-text-sub-600">{first === last ? first : `${first} – ${last}`}</Text>
      </View>
      <ScrollView ref={row} horizontal showsHorizontalScrollIndicator={false} className="-mx-4" contentContainerClassName="px-4" contentContainerStyle={{ gap: GAP }}>
        {days.map((d, i) => (
          <Tile key={d} ymd={d} on={value === d} top={i === 0 ? "Today" : weekday(d)} onPress={() => tap(d)} />
        ))}
        {later ? <Tile ymd={later} on top={monthShort(later)} onPress={() => onChange(null)} /> : null}
        <Datepicker.Root
          mode="date"
          value={value ? sydneyInstant(value) : null}
          minimumDate={new Date()}
          onChange={(d) => onChange(sydneyDate(d))}
          renderTrigger={(open) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More dates"
              onPress={open}
              className="h-14 w-14 items-center justify-center gap-0.5 rounded-lg border border-stroke-soft-200 active:bg-bg-weak-50"
            >
              <Icon name="calendar-line" className="text-[20px] leading-[20px] text-text-sub-600" />
              <Text className="text-paragraph-xs text-text-sub-600">More</Text>
            </Pressable>
          )}
        />
      </ScrollView>
    </View>
  );
}

/** Weekday over the date, 56px tall; violet when picked. */
function Tile({ ymd, on, top, onPress }: { ymd: string; on: boolean; top: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={longDay(ymd)}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{ width: TILE }}
      className={cn("h-14 items-center justify-center gap-0.5 rounded-lg", on ? "bg-primary-base" : "active:bg-bg-weak-50")}
    >
      <Text className={cn("text-paragraph-xs", on ? "text-static-white" : "text-text-sub-600")}>{top}</Text>
      <Text className={cn("text-label-md", on ? "text-static-white" : "text-text-strong-950")}>{Number(ymd.slice(8))}</Text>
    </Pressable>
  );
}
