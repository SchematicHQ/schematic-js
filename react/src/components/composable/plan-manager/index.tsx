// PlanManager composable namespace.
//
//   <PlanManager.Root>
//     <PlanManager.AddOns>{(addOn) => …}</PlanManager.AddOns>
//     <PlanManager.UsageBasedEntitlements>{(ent) => …}</PlanManager.UsageBasedEntitlements>
//     <PlanManager.Credits>{({ plan, bundles, promotional }) => …}</PlanManager.Credits>
//     <PlanManager.ChangePlanTrigger>Change plan</PlanManager.ChangePlanTrigger>
//   </PlanManager.Root>
//
// The header, trial/cancel/custom-billing notices, and other status display
// are read directly from `usePlanManager()` (they are layout-specific enough
// that a render-prop-per-section API would add little).

import * as React from "react";

import { Slot, partAttrs, type AsChildProps, type RenderProp } from "../internal";

import {
  PlanManagerProvider,
  usePlanManager,
  usePlanManagerController,
  type PlanManagerCreditGroups,
} from "./context";

export interface PlanManagerRootProps {
  children?: React.ReactNode;
}

/** Pure provider — runs the controller and publishes context. */
function Root({ children }: PlanManagerRootProps) {
  const value = usePlanManagerController();
  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      value.currentPlan,
      value.currentAddOns,
      value.creditGroups,
      value.usageBasedEntitlements,
      value.billingSubscription,
      value.customPlanBilling,
      value.trialEnd,
      value.canCheckout,
    ],
  );
  return <PlanManagerProvider value={memoized}>{children}</PlanManagerProvider>;
}
Root.displayName = "PlanManager.Root";

/** Maps over the current add-ons, calling the render-prop for each. */
function AddOns({
  children,
}: {
  children: (
    addOn: ReturnType<typeof usePlanManager>["currentAddOns"][number],
    index: number,
  ) => React.ReactNode;
}) {
  const { currentAddOns } = usePlanManager();
  return <>{currentAddOns.map((addOn, index) => children(addOn, index))}</>;
}
AddOns.displayName = "PlanManager.AddOns";

/** Maps over the usage-based entitlements, calling the render-prop for each. */
function UsageBasedEntitlements({
  children,
}: {
  children: (
    entitlement: ReturnType<typeof usePlanManager>["usageBasedEntitlements"][number],
    index: number,
  ) => React.ReactNode;
}) {
  const { usageBasedEntitlements } = usePlanManager();
  return (
    <>
      {usageBasedEntitlements.map((entitlement, index) =>
        children(entitlement, index),
      )}
    </>
  );
}
UsageBasedEntitlements.displayName = "PlanManager.UsageBasedEntitlements";

/** Exposes the grouped plan/bundle/promotional credits via render prop. */
function Credits({ children }: { children: RenderProp<PlanManagerCreditGroups> }) {
  const { creditGroups, showCredits } = usePlanManager();
  if (!showCredits) {
    return null;
  }
  return <>{children(creditGroups)}</>;
}
Credits.displayName = "PlanManager.Credits";

export type ChangePlanTriggerProps = AsChildProps<"button">;

/**
 * A button (or `asChild` element) that opens checkout to change plan. Renders
 * nothing when checkout is unavailable.
 */
const ChangePlanTrigger = React.forwardRef<
  HTMLButtonElement,
  ChangePlanTriggerProps
>(({ asChild, onClick, children, ...rest }, ref) => {
  const { canCheckout, changePlan } = usePlanManager();
  if (!canCheckout) {
    return null;
  }

  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref as React.Ref<never>}
      type={asChild ? undefined : "button"}
      {...partAttrs("change-plan-trigger")}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        (onClick as React.MouseEventHandler<HTMLButtonElement>)?.(event);
        changePlan();
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
});
ChangePlanTrigger.displayName = "PlanManager.ChangePlanTrigger";

export const PlanManager = Object.assign(Root, {
  Root,
  AddOns,
  UsageBasedEntitlements,
  Credits,
  ChangePlanTrigger,
});

export {
  PlanManagerContext,
  usePlanManager,
  type PlanManagerContextValue,
  type PlanManagerCreditGroups,
} from "./context";
