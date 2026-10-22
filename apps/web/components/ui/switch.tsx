'use client';

// AlignUI Switch v0.0.0 (Radix), styled to the Dibs Switch: a 48×28 pill, violet when on,
// and a 22px thumb that overshoots slightly as it slides.

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/utils/cn';

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'group/switch relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-stroke-sub-300 p-[3px]',
        'transition-colors duration-200 ease-out',
        'data-[state=checked]:bg-primary-base',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        'disabled:cursor-not-allowed',
        className,
      )}
      ref={forwardedRef}
      {...rest}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block size-[22px] rounded-full bg-static-white shadow-sm',
          'transition-transform duration-240 ease-spring motion-reduce:transition-none',
          'data-[state=checked]:translate-x-5',
        )}
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch as Root };
