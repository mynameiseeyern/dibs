'use client';

// AlignUI Checkbox v0.0.0 (Radix), styled to the Dibs Checkbox: 22px, radius-xs,
// a 1.5px border, violet with a white tick when checked, and a small springy pop.

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '@/utils/cn';

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <CheckboxPrimitive.Root
      ref={forwardedRef}
      className={cn(
        'peer relative grid size-[22px] shrink-0 cursor-pointer place-content-center rounded-xs',
        'border-[1.5px] border-stroke-sub-300 bg-bg-white-0',
        'transition-transform duration-160 ease-spring motion-reduce:transition-none',
        'data-[state=checked]:scale-[1.06] data-[state=checked]:border-primary-base data-[state=checked]:bg-primary-base',
        'data-[state=indeterminate]:border-primary-base data-[state=indeterminate]:bg-primary-base',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        'disabled:cursor-not-allowed disabled:border-stroke-soft-200 disabled:bg-bg-soft-200',
        className,
      )}
      {...rest}
    >
      <CheckboxPrimitive.Indicator className='grid place-content-center text-static-white'>
        {rest.checked === 'indeterminate' ? (
          <svg width='10' height='2' viewBox='0 0 10 2' fill='none' aria-hidden='true'>
            <path d='M0 1H10' strokeWidth='2.5' stroke='currentColor' />
          </svg>
        ) : (
          <svg width='12' height='9' viewBox='0 0 12 9' fill='none' aria-hidden='true'>
            <path d='M1 4.5L4.5 8L11 1' strokeWidth='2.5' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = 'Checkbox';

export { Checkbox as Root };
