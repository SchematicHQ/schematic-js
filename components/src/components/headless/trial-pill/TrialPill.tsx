import { forwardRef, type ElementType } from "react";

import { Slot, createHeadlessContext, mergeProps } from "../utils";

import {
  useTrialPill,
  type TrialPillApi,
  type TrialStatus,
} from "./useTrialPill";

const [TrialPillProvider, useTrialPillContext] =
  createHeadlessContext<TrialPillApi>(
    "TrialPill parts must be used within <TrialPill.Root>",
  );

/** Props shared by every non-root part. */
export interface TrialPillPartProps extends React.HTMLAttributes<HTMLElement> {
  /** Render as the single child element instead of the default DOM node. */
  asChild?: boolean;
}

export interface TrialPillRootProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** Trial end date (e.g. `useSchematicPlan().trialEndDate`). */
  trialEndDate?: Date;
  /** Trial status (e.g. `useSchematicPlan().trialStatus`). */
  trialStatus?: TrialStatus;
  /** Reference "now" for time-remaining math; defaults to the current time. */
  now?: Date;
  asChild?: boolean;
}

const Root = forwardRef<HTMLSpanElement, TrialPillRootProps>(
  (
    { trialEndDate, trialStatus, now, asChild, className, children, ...rest },
    ref,
  ) => {
    const api = useTrialPill({ trialEndDate, trialStatus, now });

    // No trial to display (e.g. no data yet, or the trial has converted).
    if (!api.hasTrial) {
      return null;
    }

    const props = mergeProps(
      { ...api.getRootProps(), className: "schematic-trial-pill" },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "span") as ElementType;

    return (
      <TrialPillProvider value={api}>
        <Comp ref={ref} {...props}>
          {children}
        </Comp>
      </TrialPillProvider>
    );
  },
);

Root.displayName = "TrialPill.Root";

const Label = forwardRef<HTMLSpanElement, TrialPillPartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getLabelProps } = useTrialPillContext();
    const props = mergeProps(
      { ...getLabelProps(), className: "schematic-trial-pill__label" },
      { className, ...rest },
    );
    const Comp = (asChild ? Slot : "span") as ElementType;
    return (
      <Comp ref={ref} {...props}>
        {children}
      </Comp>
    );
  },
);

Label.displayName = "TrialPill.Label";

const TimeRemaining = forwardRef<HTMLSpanElement, TrialPillPartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getTimeRemainingProps } = useTrialPillContext();
    const props = mergeProps(
      {
        ...getTimeRemainingProps(),
        className: "schematic-trial-pill__time-remaining",
      },
      {
        className,
        // only override the default ("<amount> <units>") text when provided
        ...(children !== undefined ? { children } : {}),
        ...rest,
      },
    );
    const Comp = (asChild ? Slot : "span") as ElementType;
    return <Comp ref={ref} {...props} />;
  },
);

TimeRemaining.displayName = "TrialPill.TimeRemaining";

const EndDate = forwardRef<HTMLTimeElement, TrialPillPartProps>(
  ({ asChild, className, children, ...rest }, ref) => {
    const { getEndDateProps } = useTrialPillContext();
    const props = mergeProps(
      { ...getEndDateProps(), className: "schematic-trial-pill__end-date" },
      {
        className,
        // only override the default (formatted date) text when provided
        ...(children !== undefined ? { children } : {}),
        ...rest,
      },
    );
    const Comp = (asChild ? Slot : "time") as ElementType;
    return <Comp ref={ref} {...props} />;
  },
);

EndDate.displayName = "TrialPill.EndDate";

/**
 * Headless, composable trial pill/badge. Controlled and unstyled: pass the
 * `trialEndDate`/`trialStatus` from `useSchematicPlan`; `Root` renders nothing
 * when there is no trial to show (e.g. once the plan has converted). Theme it
 * with the `schematic-trial-pill*` classes or the `data-part` /
 * `data-trial-status` / `data-expired` attributes.
 *
 * @example
 * ```tsx
 * const plan = useSchematicPlan();
 * <TrialPill.Root trialEndDate={plan?.trialEndDate} trialStatus={plan?.trialStatus}>
 *   <TrialPill.Label>Trial</TrialPill.Label>
 *   <TrialPill.TimeRemaining /> left · ends <TrialPill.EndDate />
 * </TrialPill.Root>
 * ```
 */
export const TrialPill = {
  Root,
  Label,
  TimeRemaining,
  EndDate,
};

export { useTrialPillContext };
