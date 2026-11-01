// AlignUI Popover, ported to React Native. On a phone a popover is a small bottom sheet with free content
// (the web uses it for the date picker). <Popover.Root open onOpenChange><Popover.Trigger>…</Popover.Trigger>
// <Popover.Content>…</Popover.Content></Popover.Root>. align, side and collisionPadding are accepted and ignored.

import type { ReactNode } from "react";
import { SheetClose, SheetFrame, SheetRoot, SheetTrigger, useSheet } from "./sheet";

const PopoverRoot = SheetRoot;
const PopoverTrigger = SheetTrigger;
const PopoverClose = SheetClose;
/** Kept for the web's API; a sheet has nothing to anchor to. */
const PopoverAnchor = ({ children }: { children?: ReactNode }) => <>{children}</>;

function PopoverContent({ className, children }: { className?: string; children?: ReactNode; align?: string; side?: string; sideOffset?: number; collisionPadding?: number }) {
  const { open, setOpen } = useSheet();
  return (
    <SheetFrame open={open} onClose={() => setOpen(false)} className={className}>
      {children}
    </SheetFrame>
  );
}

export { PopoverRoot as Root, PopoverTrigger as Trigger, PopoverClose as Close, PopoverAnchor as Anchor, PopoverContent as Content };
