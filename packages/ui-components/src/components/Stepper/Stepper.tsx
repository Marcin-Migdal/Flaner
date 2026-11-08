import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@flaner/shared/utils";
import {
  stepConnectorVariants,
  stepIndicatorVariants,
  stepLabelVariants,
  stepperStyles,
  type StepStatus,
} from "./Stepper.styles";

export type StepperStep = {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
};

export type StepperProps = Omit<React.ComponentProps<"ol">, "children"> & {
  steps: StepperStep[];
  /** Zero-based index of the active step; `steps.length` marks every step complete. */
  currentStep: number;
};

const getStatus = (index: number, currentStep: number): StepStatus => {
  if (index < currentStep) return "complete";
  if (index === currentStep) return "current";
  return "upcoming";
};

export function Stepper({ steps, currentStep, className, ...props }: StepperProps) {
  return (
    <ol data-slot="stepper" className={cn(stepperStyles.root, className)} {...props}>
      {steps.map((step, index) => {
        const status = getStatus(index, currentStep);

        return (
          <li
            key={step.id}
            data-status={status}
            aria-current={status === "current" ? "step" : undefined}
            className={stepperStyles.item}
          >
            <div className={stepperStyles.row}>
              <span className={stepConnectorVariants({ filled: index <= currentStep, hidden: index === 0 })} />
              <span className={stepIndicatorVariants({ status })}>
                {status === "complete" ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={stepConnectorVariants({ filled: index < currentStep, hidden: index === steps.length - 1 })}
              />
            </div>
            <span className={stepLabelVariants({ status })}>{step.label}</span>
            {step.description ? <span className={stepperStyles.description}>{step.description}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
