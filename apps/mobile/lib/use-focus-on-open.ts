import { useEffect, useRef } from "react";

/**
 * Focus a text box in a sheet once the sheet has slid up (SheetFrame takes 250ms), not as it
 * mounts. With `autoFocus` the keyboard arrives first, the sheet misses it and sits hidden behind
 * the keyboard, leaving just the dimmed page (TestFlight, Nov 2026: the place search, then Add
 * details). Use instead of `autoFocus` on anything inside a Modal:
 *
 *   const input = useFocusOnOpen<TextInput>(open);
 *   <Input.Input ref={input} … />
 */
export function useFocusOnOpen<T extends { focus(): void }>(open: boolean, delay = 320) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => ref.current?.focus(), delay);
    return () => clearTimeout(t);
  }, [open, delay]);
  return ref;
}
