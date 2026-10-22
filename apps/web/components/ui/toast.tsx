'use client';

// AlignUI Toast (sonner + Alert), styled for Dibs: a white card on shadow-md, radius-lg,
// a status icon in its -dark colour, and it sits above the pinned main action on phones.
// Use for quick confirmations ("Link copied", "Bill added"). Anything someone must act on
// stays on the page as an Alert instead.

import * as React from 'react';
import { Toaster as Sonner, toast as sonnerToast, type ExternalToast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiInformationFill, RiAlertFill } from '@remixicon/react';
import * as Alert from '@/components/ui/alert';

type Status = 'success' | 'error' | 'warning' | 'information';

const ICONS = {
  success: RiCheckboxCircleFill,
  error: RiErrorWarningFill,
  warning: RiAlertFill,
  information: RiInformationFill,
} as const;

/** Mount once, in the root layout. */
export function Toaster() {
  return (
    <Sonner
      position='bottom-center'
      // Clears the 72px dock and the safe area on phones.
      offset={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
      mobileOffset={{ bottom: 'calc(96px + env(safe-area-inset-bottom))', left: 16, right: 16 }}
      gap={8}
      toastOptions={{ unstyled: true, className: 'w-full' }}
      style={{ ['--width']: '488px' }}
    />
  );
}

function ToastCard({ status, title, description }: { status: Status; title: string; description?: string }) {
  const Icon = ICONS[status];
  return (
    <Alert.Root variant='stroke' status={status} size='large' className='rounded-lg' role={status === 'error' ? 'alert' : 'status'}>
      <Alert.Icon as={Icon} />
      <div>
        <strong>{title}</strong>
        {description}
      </div>
    </Alert.Root>
  );
}

function show(status: Status, title: string, opts?: ExternalToast & { description?: string }) {
  const { description, ...rest } = opts ?? {};
  return sonnerToast.custom(() => <ToastCard status={status} title={title} description={description} />, {
    duration: 3000,
    ...rest,
  });
}

/** `toast.success("Link copied")`, `toast.error("Couldn't save that", { description: "Try again in a sec." })` */
export const toast = {
  success: (title: string, opts?: ExternalToast & { description?: string }) => show('success', title, opts),
  error: (title: string, opts?: ExternalToast & { description?: string }) => show('error', title, opts),
  warning: (title: string, opts?: ExternalToast & { description?: string }) => show('warning', title, opts),
  info: (title: string, opts?: ExternalToast & { description?: string }) => show('information', title, opts),
  dismiss: sonnerToast.dismiss,
};
