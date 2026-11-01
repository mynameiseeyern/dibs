// The Dibby bottom sheet, the shared frame for Modal, Drawer, Popover, Dropdown and Select.
// On a phone every overlay slides up from the bottom: radius-xl top corners, a grab handle,
// the overlay token behind it, tap outside or Android back to close, and room for the keyboard.

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/utils/cn";
import { ThemeScope, useShadow } from "@/lib/theme";

// ---------- open state, Radix-style: controlled (open + onOpenChange) or not (defaultOpen) ----------

export function useControllableOpen(
  open?: boolean,
  defaultOpen = false,
  onOpenChange?: (open: boolean) => void,
) {
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInner(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );
  return [isOpen, setOpen] as const;
}

type SheetState = { open: boolean; setOpen: (open: boolean) => void };
export const SheetContext = createContext<SheetState>({
  open: false,
  setOpen: () => {},
});
export const useSheet = () => useContext(SheetContext);

export type SheetRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

export function SheetRoot({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: SheetRootProps) {
  const [isOpen, setOpen] = useControllableOpen(
    open,
    defaultOpen,
    onOpenChange,
  );
  return (
    <SheetContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

type Pressish = ReactElement<{ onPress?: (e: GestureResponderEvent) => void }>;

/**
 * Adds an onPress to its one child (a Button.Root, a Pressable…), keeping the child's own.
 * The web's `asChild` is accepted and ignored: on a phone the child always is the trigger.
 */
export function pressThrough(
  children: ReactNode,
  onPress: () => void,
): ReactNode {
  const child = Children.only(children);
  if (!isValidElement(child)) return child;
  const el = child as Pressish;
  return cloneElement(el, {
    onPress: (e: GestureResponderEvent) => {
      el.props.onPress?.(e);
      onPress();
    },
  });
}

export function SheetTrigger({
  children,
}: {
  children: ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = useSheet();
  return <>{pressThrough(children, () => setOpen(true))}</>;
}

export function SheetClose({
  children,
}: {
  children: ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = useSheet();
  return <>{pressThrough(children, () => setOpen(false))}</>;
}

// ---------- the frame ----------

export type SheetFrameProps = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  className?: string;
  /** Show the grab handle (on by default). */
  handle?: boolean;
  /** Fill the screen height (the Drawer). */
  full?: boolean;
};

/** Slides the sheet up over the overlay, and back down before it unmounts. */
export function SheetFrame({
  open,
  onClose,
  children,
  className,
  handle = true,
  full,
}: SheetFrameProps) {
  const [mounted, setMounted] = useState(open);
  const progress = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const shadow = useShadow("md");

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 250,
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 150,
        easing: Easing.bezier(0.4, 0, 1, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, mounted, progress]);

  if (!mounted) return null;

  const slide = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 0],
  });
  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <ThemeScope>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end"
        >
          <Animated.View
            style={{ opacity: progress }}
            className="absolute inset-0 bg-overlay"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              className="flex-1"
            />
          </Animated.View>
          <Animated.View
            accessibilityViewIsModal
            style={[
              shadow,
              {
                opacity: progress,
                transform: [{ translateY: slide }],
                paddingBottom: Math.max(insets.bottom, 0) + 24,
                paddingTop: full ? insets.top + 12 : 12,
              },
            ]}
            className={cn(
              "w-full gap-4 rounded-t-xl bg-bg-white-0 px-4",
              full && "flex-1 rounded-t-none",
              className,
            )}
          >
            {handle && !full ? (
              <View className="h-[5px] w-10 self-center rounded-full bg-bg-sub-300" />
            ) : null}
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </ThemeScope>
    </Modal>
  );
}
