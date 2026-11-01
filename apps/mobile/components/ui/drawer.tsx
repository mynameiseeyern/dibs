// AlignUI Drawer, ported to React Native. The web's side panel becomes a full-height sheet on a phone.
// <Drawer.Root><Drawer.Trigger>…</Drawer.Trigger><Drawer.Content><Drawer.Header><Drawer.Title>…</Drawer.Title></Drawer.Header>
//   <Drawer.Body>…</Drawer.Body><Drawer.Footer>…</Drawer.Footer></Drawer.Content></Drawer.Root>

import type { ReactNode } from "react";
import { ScrollView, Text, View, type TextProps, type ViewProps } from "react-native";
import { cn } from "@/utils/cn";
import { wrapText } from "@/utils/wrap-text";
import * as Button from "./button";
import { SheetClose, SheetFrame, SheetRoot, SheetTrigger, useSheet } from "./sheet";

const DrawerRoot = SheetRoot;
const DrawerTrigger = SheetTrigger;
const DrawerClose = SheetClose;

function DrawerContent({ className, children }: { className?: string; children?: ReactNode }) {
  const { open, setOpen } = useSheet();
  return (
    <SheetFrame open={open} onClose={() => setOpen(false)} full className={cn("gap-0 px-0", className)}>
      {children}
    </SheetFrame>
  );
}

function DrawerHeader({ className, children, showCloseButton = true, ...rest }: ViewProps & { className?: string; showCloseButton?: boolean }) {
  const { setOpen } = useSheet();
  return (
    <View className={cn("flex-row items-center gap-3 border-b border-stroke-soft-200 px-4 pb-3", className)} {...rest}>
      {children}
      {showCloseButton ? (
        <Button.Root variant="neutral" mode="ghost" iconOnly accessibilityLabel="Close" onPress={() => setOpen(false)}>
          <Button.Icon name="close-line" />
        </Button.Root>
      ) : null}
    </View>
  );
}

function DrawerTitle({ className, ...rest }: TextProps & { className?: string }) {
  return <Text accessibilityRole="header" className={cn("flex-1 text-label-lg text-text-strong-950", className)} {...rest} />;
}

/** Scrolls when it's taller than the screen. */
function DrawerBody({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <ScrollView className="flex-1" contentContainerClassName={cn("p-4", className)}>
      {wrapText(children, "text-paragraph-md text-text-sub-600")}
    </ScrollView>
  );
}

function DrawerFooter({ className, ...rest }: ViewProps & { className?: string }) {
  return <View className={cn("gap-2 border-t border-stroke-soft-200 px-4 pt-3", className)} {...rest} />;
}

export {
  DrawerRoot as Root,
  DrawerTrigger as Trigger,
  DrawerClose as Close,
  DrawerContent as Content,
  DrawerHeader as Header,
  DrawerTitle as Title,
  DrawerBody as Body,
  DrawerFooter as Footer,
};
