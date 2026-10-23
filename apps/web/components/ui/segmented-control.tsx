// AlignUI SegmentedControl v0.0.0

'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import mergeRefs from 'merge-refs';
import { Slottable } from '@radix-ui/react-slot';
import { cn } from '@/utils/cn';
import { useTabObserver } from '@/hooks/use-tab-observer';

const SegmentedControlRoot = TabsPrimitive.Root;
SegmentedControlRoot.displayName = 'SegmentedControlRoot';

const SegmentedControlList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    floatingBgClassName?: string;
  }
>(({ children, className, floatingBgClassName, ...rest }, forwardedRef) => {
  const [lineStyle, setLineStyle] = React.useState({ width: 0, left: 0 });

  const { mounted, listRef } = useTabObserver({
    onActiveTabChange: (_, activeTab) => {
      const { offsetWidth: width, offsetLeft: left } = activeTab;
      setLineStyle({ width, left });
    },
  });

  return (
    <TabsPrimitive.List
      ref={mergeRefs(forwardedRef, listRef)}
      className={cn(
        'relative isolate grid w-full auto-cols-fr grid-flow-col gap-1 rounded-md bg-bg-soft-200 p-1',
        // Radix can briefly focus the list itself and sets an inline outline:none, so show a ring instead.
        'focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-white-0',
        className,
      )}
      {...rest}
    >
      <Slottable>{children}</Slottable>

      {/* floating bg */}
      <div
        className={cn(
          // The selected pill inverts to ink, so it reads in both themes.
          'absolute inset-y-1 left-0 -z-10 rounded-[12px] bg-bg-strong-950 shadow-xs transition-transform duration-300 motion-reduce:transition-none',
          {
            hidden: !mounted,
          },
          floatingBgClassName,
        )}
        style={{
          transform: `translate3d(${lineStyle.left}px, 0, 0)`,
          width: `${lineStyle.width}px`,
          transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
        }}
        aria-hidden='true'
      />
    </TabsPrimitive.List>
  );
});
SegmentedControlList.displayName = 'SegmentedControlList';

const SegmentedControlTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <TabsPrimitive.Trigger
      ref={forwardedRef}
      className={cn(
        // base
        'peer',
        'relative z-10 min-h-9 cursor-pointer whitespace-nowrap rounded-[12px] px-3 font-sans text-label-sm text-text-sub-600',
        // 44px to tap inside the list's 4px padding.
        "before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']",
        'flex items-center justify-center gap-1.5',
        'transition duration-300 ease-out',
        // focus
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        // active
        'not-data-[state=active]:hover:text-text-strong-950 data-[state=active]:text-text-white-0',
        // The selected tab carries its own ink background too, so its white label never sits on the
        // light list (before the sliding pill has measured, or for contrast checkers).
        'data-[state=active]:bg-bg-strong-950',
        className,
      )}
      {...rest}
    />
  );
});
SegmentedControlTrigger.displayName = 'SegmentedControlTrigger';

const SegmentedControlContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ ...rest }, forwardedRef) => {
  return <TabsPrimitive.Content ref={forwardedRef} {...rest} />;
});
SegmentedControlContent.displayName = 'SegmentedControlContent';

export {
  SegmentedControlRoot as Root,
  SegmentedControlList as List,
  SegmentedControlTrigger as Trigger,
  SegmentedControlContent as Content,
};
