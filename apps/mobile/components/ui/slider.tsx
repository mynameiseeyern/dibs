// AlignUI Slider, as a themed wrapper around @react-native-community/slider (the platform slider).
// Violet fill, stroke-sub-300 track. Takes a number, not the web's one-item array.
// <Slider.Root value={spots} onValueChange={setSpots} min={2} max={20} step={1} accessibilityLabel="Spots" />

import { View } from "react-native";
import NativeSlider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { cn } from "@/utils/cn";
import { useColour } from "@/lib/theme";

type SliderProps = {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** When the finger lifts: the moment to save. */
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  accessibilityLabel?: string;
};

function SliderRoot({ value, defaultValue, onValueChange, onValueCommit, min = 0, max = 100, step = 1, disabled, className, accessibilityLabel }: SliderProps) {
  const fill = useColour(disabled ? "text-disabled-300" : "primary-base");
  const track = useColour("stroke-sub-300");
  const thumb = useColour(disabled ? "bg-soft-200" : "primary-base");
  return (
    <View className={cn("min-h-11 justify-center", className)}>
      <NativeSlider
        value={value ?? defaultValue}
        minimumValue={min}
        maximumValue={max}
        step={step}
        disabled={disabled}
        minimumTrackTintColor={fill}
        maximumTrackTintColor={track}
        thumbTintColor={thumb}
        accessibilityLabel={accessibilityLabel}
        onValueChange={(v) => {
          if (step >= 1) Haptics.selectionAsync();
          onValueChange?.(v);
        }}
        onSlidingComplete={onValueCommit}
      />
    </View>
  );
}

export { SliderRoot as Root };
