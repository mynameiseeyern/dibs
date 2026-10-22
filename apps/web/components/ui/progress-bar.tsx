// AlignUI ProgressBar v0.0.0

import * as React from 'react';
import { tv, type VariantProps } from '@/utils/tv';

export const progressBarVariants = tv({
  slots: {
    // Dibs Progress: a 10px pill track, violet fill by default.
    root: 'h-2.5 w-full overflow-hidden rounded-full bg-bg-soft-200',
    progress: 'h-full rounded-full transition-all duration-300 ease-out motion-reduce:transition-none',
  },
  variants: {
    color: {
      primary: { progress: 'bg-primary-bar' },
      // Lime gets an ink edge so it reads on the light track; done is success-dark.
      accent: { progress: 'bg-accent-base shadow-[inset_0_0_0_1.5px_var(--stroke-strong-950)]' },
      success: { progress: 'bg-success-dark' },
      information: { progress: 'bg-information-base' },
      warning: { progress: 'bg-warning-base' },
      error: { progress: 'bg-error-base' },
    },
  },
  defaultVariants: {
    color: 'primary',
  },
})

type ProgressBarRootProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof progressBarVariants> & {
    value?: number;
    max?: number;
  };

const ProgressBarRoot = React.forwardRef<HTMLDivElement, ProgressBarRootProps>(
  ({ className, color, value = 0, max = 100, ...rest }, forwardedRef) => {
    const { root, progress } = progressBarVariants({ color });
    const safeValue = Math.min(max, Math.max(value, 0));

    return (
      <div
        ref={forwardedRef}
        role='progressbar'
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={max}
        className={root({ class: className })}
        {...rest}
      >
        <div
          className={progress()}
          style={{
            width: `${(safeValue / max) * 100}%`,
          }}
        />
      </div>
    );
  },
);
ProgressBarRoot.displayName = 'ProgressBarRoot';

export { ProgressBarRoot as Root };
