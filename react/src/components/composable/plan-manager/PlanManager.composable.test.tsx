import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import {
  PlanManager,
  PlanManagerContext,
  type PlanManagerContextValue,
} from ".";

function baseValue(
  overrides: Partial<PlanManagerContextValue> = {},
): PlanManagerContextValue {
  return {
    currentPlan: undefined,
    currentAddOns: [],
    creditBundles: [],
    creditGroups: { plan: [], bundles: [], promotional: [] },
    billingSubscription: undefined,
    canCheckout: true,
    postTrialPlan: undefined,
    featureUsage: [],
    usageBasedEntitlements: [],
    showCredits: true,
    showZeroPriceAsFree: false,
    trialPaymentMethodRequired: false,
    scheduledDowngrade: undefined,
    subscriptionInterval: undefined,
    subscriptionCurrency: undefined,
    willSubscriptionCancel: false,
    isTrialSubscription: false,
    currentPlanPeriod: undefined,
    isFreePlan: false,
    isUsageBasedPlan: false,
    hasAutoTopupSelfService: false,
    customPlanBilling: undefined,
    trialEnd: {},
    changePlan: vi.fn(),
    editAutoTopup: vi.fn(),
    ...overrides,
  } as PlanManagerContextValue;
}

function withContext(
  ui: React.ReactNode,
  overrides: Partial<PlanManagerContextValue> = {},
) {
  return render(
    <PlanManagerContext.Provider value={baseValue(overrides)}>
      {ui}
    </PlanManagerContext.Provider>,
  );
}

describe("PlanManager primitives", () => {
  test("AddOns maps over current add-ons", () => {
    withContext(
      <PlanManager.AddOns>
        {(addOn) => <div key={addOn.id}>{addOn.name}</div>}
      </PlanManager.AddOns>,
      {
        currentAddOns: [
          { id: "a1", name: "Add-on 1" },
        ] as PlanManagerContextValue["currentAddOns"],
      },
    );
    expect(screen.getByText("Add-on 1")).toBeInTheDocument();
  });

  test("ChangePlanTrigger calls changePlan and gates on canCheckout", () => {
    const changePlan = vi.fn();
    const { rerender } = withContext(
      <PlanManager.ChangePlanTrigger>Change</PlanManager.ChangePlanTrigger>,
      { changePlan },
    );

    fireEvent.click(screen.getByText("Change"));
    expect(changePlan).toHaveBeenCalledTimes(1);

    rerender(
      <PlanManagerContext.Provider value={baseValue({ canCheckout: false })}>
        <PlanManager.ChangePlanTrigger>Change</PlanManager.ChangePlanTrigger>
      </PlanManagerContext.Provider>,
    );
    expect(screen.queryByText("Change")).not.toBeInTheDocument();
  });

  test("Credits exposes the grouped credits and gates on showCredits", () => {
    withContext(
      <PlanManager.Credits>
        {({ plan }) => <span>plan-credits:{plan.length}</span>}
      </PlanManager.Credits>,
      {
        creditGroups: {
          plan: [
            {} as PlanManagerContextValue["creditGroups"]["plan"][number],
          ],
          bundles: [],
          promotional: [],
        },
      },
    );
    expect(screen.getByText("plan-credits:1")).toBeInTheDocument();
  });

  test("usePlanManager throws outside Root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<PlanManager.AddOns>{() => null}</PlanManager.AddOns>),
    ).toThrow(/must be rendered inside/);
    spy.mockRestore();
  });
});
