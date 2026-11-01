// AlignUI Modal, ported to React Native as the Dibby bottom sheet. Same API as apps/web/components/ui/modal:
// <Modal.Root open onOpenChange><Modal.Trigger><Button.Root>…</Button.Root></Modal.Trigger>
//   <Modal.Content><Modal.Header title="…" description="…" /><Modal.Body>…</Modal.Body>
//   <Modal.Footer><Button.Root block>…</Button.Root><Modal.Close>…</Modal.Close></Modal.Footer></Modal.Content></Modal.Root>

import type { ReactNode } from "react";
import { Text, View, type TextProps, type ViewProps } from "react-native";
import { cn } from "@/utils/cn";
import { wrapText } from "@/utils/wrap-text";
import * as Button from "./button";
import { Icon, type IconName } from "./icon";
import { SheetClose, SheetFrame, SheetRoot, SheetTrigger, useSheet } from "./sheet";

const ModalRoot = SheetRoot;
const ModalTrigger = SheetTrigger;
const ModalClose = SheetClose;

function ModalContent({ className, children, showClose = true }: { className?: string; children?: ReactNode; showClose?: boolean }) {
  const { open, setOpen } = useSheet();
  return (
    <SheetFrame open={open} onClose={() => setOpen(false)} className={className}>
      {children}
      {showClose ? (
        <View className="absolute right-3 top-4">
          <Button.Root variant="neutral" mode="ghost" iconOnly accessibilityLabel="Close" onPress={() => setOpen(false)}>
            <Button.Icon name="close-line" />
          </Button.Root>
        </View>
      ) : null}
    </SheetFrame>
  );
}

/** Title, optional description, and an optional icon in a soft violet circle. Leaves room for the close button. */
function ModalHeader({ className, children, icon, title, description, ...rest }: ViewProps & { className?: string; icon?: IconName; title?: string; description?: string }) {
  return (
    <View className={cn("flex-row items-start gap-3 pr-12", className)} {...rest}>
      {children ?? (
        <>
          {icon ? (
            <View className="size-11 items-center justify-center rounded-full bg-primary-lighter">
              <Icon name={icon} className="text-primary-dark" />
            </View>
          ) : null}
          {title || description ? (
            <View className="flex-1 gap-1">
              {title ? <ModalTitle>{title}</ModalTitle> : null}
              {description ? <ModalDescription>{description}</ModalDescription> : null}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function ModalTitle({ className, ...rest }: TextProps & { className?: string }) {
  return <Text accessibilityRole="header" className={cn("text-title-h5 text-text-strong-950", className)} {...rest} />;
}

function ModalDescription({ className, ...rest }: TextProps & { className?: string }) {
  return <Text className={cn("text-paragraph-md text-text-sub-600", className)} {...rest} />;
}

/** Strings come out as body text; anything else is laid out as given. */
function ModalBody({ className, children, ...rest }: ViewProps & { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("gap-3", className)} {...rest}>
      {wrapText(children, "text-paragraph-md text-text-sub-600")}
    </View>
  );
}

/** Actions stack, main action first, within thumb reach. Make each Button `block`. */
function ModalFooter({ className, ...rest }: ViewProps & { className?: string }) {
  return <View className={cn("gap-2", className)} {...rest} />;
}

export {
  ModalRoot as Root,
  ModalTrigger as Trigger,
  ModalClose as Close,
  ModalContent as Content,
  ModalHeader as Header,
  ModalTitle as Title,
  ModalDescription as Description,
  ModalBody as Body,
  ModalFooter as Footer,
};
