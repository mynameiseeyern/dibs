// AlignUI Switch, ported to React Native and styled to the Dibby Switch: a 48×28 pill, violet when
// on, and a 22px white thumb that springs across. Turns a setting on or off straight away.
// <Switch.Root checked={on} onCheckedChange={setOn} accessibilityLabel="Close the group" />

import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, type PressableProps } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "@/utils/cn";
import { useShadow } from "@/lib/theme";

type SwitchProps = Omit<PressableProps, "children" | "onPress"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

function SwitchRoot({ checked, defaultChecked, onCheckedChange, disabled, className, ...rest }: SwitchProps) {
  const [own, setOwn] = useState(!!defaultChecked);
  const on = checked ?? own;
  const x = useRef(new Animated.Value(on ? 20 : 0)).current;
  const thumbShadow = useShadow("sm");

  useEffect(() => {
    Animated.spring(x, { toValue: on ? 20 : 0, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
  }, [on, x]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled: !!disabled }}
      disabled={disabled}
      // 28px to look at, 44px to tap.
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync();
        if (checked === undefined) setOwn(!on);
        onCheckedChange?.(!on);
      }}
      className={cn("h-7 w-12 justify-center rounded-full p-[3px]", on ? "bg-primary-base" : "bg-stroke-sub-300", disabled && "opacity-50", className)}
      {...rest}
    >
      <Animated.View className="size-[22px] rounded-full bg-static-white" style={[thumbShadow, { transform: [{ translateX: x }] }]} />
    </Pressable>
  );
}

export { SwitchRoot as Root };
