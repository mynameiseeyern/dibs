// The pill that slides to the active item in SegmentedControl and TabMenuHorizontal.
// Each trigger reports its layout; the indicator springs to the active one's x and width.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, type LayoutChangeEvent } from "react-native";

type Box = { x: number; width: number };

export function useSlidingIndicator(active: string | undefined) {
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const x = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  const measure = useCallback(
    (value: string) => (e: LayoutChangeEvent) => {
      const { x: bx, width: bw } = e.nativeEvent.layout;
      setBoxes((b) => (b[value]?.x === bx && b[value]?.width === bw ? b : { ...b, [value]: { x: bx, width: bw } }));
    },
    [],
  );

  const box = active ? boxes[active] : undefined;
  useEffect(() => {
    if (!box) return;
    if (!placed.current) {
      // First layout: jump there, no slide in from the left.
      x.setValue(box.x);
      width.setValue(box.width);
      placed.current = true;
      return;
    }
    Animated.parallel([
      Animated.spring(x, { toValue: box.x, useNativeDriver: false, speed: 16, bounciness: 4 }),
      Animated.spring(width, { toValue: box.width, useNativeDriver: false, speed: 16, bounciness: 4 }),
    ]).start();
  }, [box, x, width]);

  return { measure, style: { left: x, width }, visible: !!box };
}
