'use client';

// AlignUI Modal v0.0.0

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as CompactButton from '@/components/ui/compact-button';
import { cn } from '@/utils/cn';
import { type RemixiconComponentType, RiCloseLine } from '@remixicon/react';

const ModalRoot = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalClose = DialogPrimitive.Close;
const ModalPortal = DialogPrimitive.Portal;

const ModalOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <DialogPrimitive.Overlay
      ref={forwardedRef}
      className={cn(
        // base
        // Dibs Bottom sheet: pinned to the bottom on phones, a centred card from 768px.
        'fixed inset-0 z-50 flex flex-col items-center justify-end overflow-y-auto bg-overlay md:justify-center md:p-4',
        // animation
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...rest}
    />
  );
});
ModalOverlay.displayName = 'ModalOverlay';

const ModalContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    overlayClassName?: string;
    showClose?: boolean;
  }
>(
  (
    { className, overlayClassName, children, showClose = true, ...rest },
    forwardedRef,
  ) => {
    return (
      <ModalPortal>
        <ModalOverlay className={overlayClassName}>
          <DialogPrimitive.Content
            ref={forwardedRef}
            className={cn(
              // base: the Dibs Bottom sheet
              'relative flex w-full max-w-[480px] flex-col gap-4 font-sans',
              'rounded-t-xl bg-bg-white-0 px-4 pb-[calc(var(--space-6)+env(safe-area-inset-bottom))] pt-3 shadow-md',
              'md:rounded-xl md:p-6',
              // grab handle on phones
              'before:mx-auto before:block before:h-[5px] before:w-10 before:rounded-full before:bg-bg-sub-300 before:content-[""] md:before:hidden',
              // focus
              'focus:outline-none',
              // animation: slides up on phones, pops in from 768px
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
              'data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8',
              'md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=open]:zoom-in-95',
              'data-[state=open]:duration-250 data-[state=open]:ease-spring motion-reduce:data-[state=open]:slide-in-from-bottom-0',
              className,
            )}
            {...rest}
          >
            {children}
            {showClose && (
              <ModalClose asChild>
                <CompactButton.Root
                  variant='ghost'
                  size='large'
                  className='absolute right-3 top-4 md:top-5'
                  aria-label='Close'
                >
                  <CompactButton.Icon as={RiCloseLine} />
                </CompactButton.Root>
              </ModalClose>
            )}
          </DialogPrimitive.Content>
        </ModalOverlay>
      </ModalPortal>
    );
  },
);
ModalContent.displayName = 'ModalContent';

function ModalHeader({
  className,
  children,
  icon: Icon,
  title,
  description,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  icon?: RemixiconComponentType;
  title?: string;
  description?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex items-start gap-3 pr-12',
        className,
      )}
      {...rest}
    >
      {children || (
        <>
          {Icon && (
            <div className='flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-lighter'>
              <Icon className='size-5 text-primary-dark' />
            </div>
          )}
          {(title || description) && (
            <div className='flex-1 space-y-1'>
              {title && <ModalTitle>{title}</ModalTitle>}
              {description && (
                <ModalDescription>{description}</ModalDescription>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
ModalHeader.displayName = 'ModalHeader';

const ModalTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <DialogPrimitive.Title
      ref={forwardedRef}
      className={cn('font-display text-title-h5 text-text-strong-950', className)}
      {...rest}
    />
  );
});
ModalTitle.displayName = 'ModalTitle';

const ModalDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <DialogPrimitive.Description
      ref={forwardedRef}
      className={cn('text-paragraph-md text-text-sub-600', className)}
      {...rest}
    />
  );
});
ModalDescription.displayName = 'ModalDescription';

function ModalBody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-paragraph-md text-text-sub-600', className)} {...rest} />;
}
ModalBody.displayName = 'ModalBody';

function ModalFooter({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Actions stack on phones (main action first), sit in a row from 768px.
        'flex flex-col gap-2 md:flex-row-reverse',
        className,
      )}
      {...rest}
    />
  );
}

ModalFooter.displayName = 'ModalFooter';

export {
  ModalRoot as Root,
  ModalTrigger as Trigger,
  ModalClose as Close,
  ModalPortal as Portal,
  ModalOverlay as Overlay,
  ModalContent as Content,
  ModalHeader as Header,
  ModalTitle as Title,
  ModalDescription as Description,
  ModalBody as Body,
  ModalFooter as Footer,
};
