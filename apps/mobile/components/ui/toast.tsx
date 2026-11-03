// AlignUI Toast, ported to React Native and styled for Dibby: a white card on shadow-md, radius-lg, a
// status icon in its -dark colour, sliding in at the top under the status bar. For quick confirmations
// ("Link copied", "Bill added"); anything someone must act on stays on the screen as an Alert.
//
// Mount <Toaster /> once at the root, then anywhere:
//   toast.success("Link copied")
//   toast.error("Couldn't save that", { description: "Try again in a sec.", retry: save })
//   toast("Heads up")                       // same as toast.info

import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Alert from "./alert";

type Status = "success" | "error" | "warning" | "information";
type Options = { description?: string; retry?: () => void; duration?: number };
type Item = Options & { id: number; status: Status; title: string };

// A tiny store, so toast() works from anywhere (event handlers, async code) without a hook.
let items: Item[] = [];
let nextId = 1;
const listeners = new Set<(items: Item[]) => void>();
const emit = () => listeners.forEach((l) => l(items));

function show(status: Status, title: string, opts?: Options) {
  const id = nextId++;
  // Newest on top; three at most, so a burst doesn't cover the screen.
  items = [{ id, status, title, ...opts }, ...items].slice(0, 3);
  emit();
  return id;
}

function dismiss(id?: number) {
  items = id == null ? [] : items.filter((t) => t.id !== id);
  emit();
}

type ToastFn = ((title: string, opts?: Options) => number) & {
  success: (title: string, opts?: Options) => number;
  error: (title: string, opts?: Options) => number;
  warning: (title: string, opts?: Options) => number;
  info: (title: string, opts?: Options) => number;
  dismiss: (id?: number) => void;
};

/** `toast.success("Link copied")`, `toast.error("Couldn't save that", { description: "Try again in a sec." })` */
export const toast: ToastFn = Object.assign((title: string, opts?: Options) => show("information", title, opts), {
  success: (title: string, opts?: Options) => show("success", title, opts),
  error: (title: string, opts?: Options) => show("error", title, opts),
  warning: (title: string, opts?: Options) => show("warning", title, opts),
  info: (title: string, opts?: Options) => show("information", title, opts),
  dismiss,
});

/** Mount once, at the root, above everything else. */
export function Toaster() {
  const [list, setList] = useState<Item[]>(items);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  if (list.length === 0) return null;
  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 top-0 gap-2 px-4" style={{ paddingTop: insets.top + 8 }}>
      {list.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </View>
  );
}

function ToastCard({ item }: { item: Item }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
    const timer = setTimeout(() => leave(), item.duration ?? 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function leave() {
    Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => dismiss(item.id));
  }

  return (
    <Animated.View
      accessibilityLiveRegion={item.status === "error" ? "assertive" : "polite"}
      style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }}
    >
      <Pressable accessibilityRole="button" accessibilityHint="Dismisses this message" onPress={leave}>
        <Alert.Root variant="stroke" status={item.status} size="large">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Title>{item.title}</Alert.Title>
            {item.description ? <Text className="text-paragraph-sm text-text-sub-600">{item.description}</Text> : null}
          </Alert.Content>
          {item.retry ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => {
                leave();
                item.retry?.();
              }}
            >
              <Text className="text-label-sm text-primary-dark underline">Try again</Text>
            </Pressable>
          ) : null}
        </Alert.Root>
      </Pressable>
    </Animated.View>
  );
}
