"use client";

import * as Stepper from "@/components/ui/horizontal-stepper";

export const PLAN_STEPS = ["The plan", "Dibby and extras", "Share it"] as const;

/**
 * Where you are in making a plan. Steps you've done can be tapped to go back to (via `onPick`);
 * the ones ahead can't be skipped to.
 */
export function WizardSteps({ step, onPick }: { step: 1 | 2 | 3; onPick?: (step: 1 | 2) => void }) {
  return (
    <nav aria-label="Making a plan">
      <Stepper.Root className="wizard-steps">
        {PLAN_STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const state = n < step ? "completed" : n === step ? "active" : "default";
          const canGoBack = n < step && n < 3 && step < 3 && onPick;
          return (
            <Stepper.Item
              key={label}
              type="button"
              state={state}
              disabled={!canGoBack}
              aria-current={n === step ? "step" : undefined}
              onClick={canGoBack ? () => onPick(n as 1 | 2) : undefined}
            >
              <Stepper.ItemIndicator>{n}</Stepper.ItemIndicator>
              <span>{label}</span>
            </Stepper.Item>
          );
        })}
      </Stepper.Root>
    </nav>
  );
}
