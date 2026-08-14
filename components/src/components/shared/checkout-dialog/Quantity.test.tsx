import { screen } from "@testing-library/react";

import { render } from "../../../test/setup";
import type { SelectedPlan, UsageBasedEntitlement } from "../../../types";

import { Quantity } from "./Quantity";

type EntitlementOverrides = Partial<Omit<UsageBasedEntitlement, "feature">> & {
  feature?: { id: string; name: string; licenseId?: string };
};

function makeEntitlement(
  overrides: EntitlementOverrides = {},
): UsageBasedEntitlement {
  return {
    id: "ent-1",
    featureId: "feat-1",
    feature: {
      id: "feat-1",
      name: "Feature",
    },
    allocation: 0,
    usage: 0,
    quantity: 0,
    ...overrides,
  } as UsageBasedEntitlement;
}

describe("`Quantity` component", () => {
  it("renders the entitlement quantity in the uncontrolled input", () => {
    render(
      <Quantity
        isLoading={false}
        period="month"
        entitlements={[makeEntitlement({ quantity: 5 })]}
        updateQuantity={() => {}}
      />,
    );

    expect(screen.getByRole("spinbutton")).toHaveValue(5);
  });

  it("re-syncs the uncontrolled input when the entitlement at a position changes identity", () => {
    const { rerender } = render(
      <Quantity
        isLoading={false}
        period="month"
        entitlements={[
          makeEntitlement({
            id: "ent-a",
            featureId: "feat-a",
            feature: { id: "feat-a", name: "Feature A" },
            quantity: 5,
          }),
        ]}
        updateQuantity={() => {}}
      />,
    );

    expect(screen.getByText("Feature A")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(5);

    rerender(
      <Quantity
        isLoading={false}
        period="month"
        entitlements={[
          makeEntitlement({
            id: "ent-b",
            featureId: "feat-b",
            feature: { id: "feat-b", name: "Feature B" },
            quantity: 2,
          }),
        ]}
        updateQuantity={() => {}}
      />,
    );

    expect(screen.getByText("Feature B")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(2);
  });
});

describe("per-license credits", () => {
  const licenseFeature = {
    id: "feat-seat",
    name: "User Seat",
    licenseId: "license-1",
  };

  const seatEntitlement = makeEntitlement({
    feature: licenseFeature,
    allocation: 4,
    usage: 4,
    quantity: 6,
  });

  function makePlan(overrides: Record<string, unknown> = {}) {
    return {
      id: "plan-1",
      current: true,
      includedCreditGrants: [
        {
          id: "grant-1",
          creditId: "credit-1",
          creditName: "Credits",
          creditAmount: 100,
          licenseId: "license-1",
          scaling: "per_license",
          resetCadence: "monthly",
        },
      ],
      ...overrides,
    } as unknown as SelectedPlan;
  }

  it("shows the seats × credits math for a license feature", () => {
    render(
      <Quantity
        isLoading={false}
        period="month"
        selectedPlan={makePlan()}
        entitlements={[seatEntitlement]}
        updateQuantity={() => {}}
      />,
    );

    expect(screen.getByText("Credits included")).toBeInTheDocument();
    expect(
      screen.getByText("6 User Seats × 100 = 600 Credits/mo"),
    ).toBeInTheDocument();
  });

  it("explains the prorated credit delta when increasing the quantity on the current plan", () => {
    render(
      <Quantity
        isLoading={false}
        period="month"
        selectedPlan={makePlan()}
        entitlements={[seatEntitlement]}
        updateQuantity={() => {}}
      />,
    );

    expect(
      screen.getByText(
        "Adding 2 User Seats grants 200 more Credits today, prorated.",
      ),
    ).toBeInTheDocument();
  });

  it("omits the delta message when the plan is not the current plan", () => {
    render(
      <Quantity
        isLoading={false}
        period="month"
        selectedPlan={makePlan({ current: false })}
        entitlements={[seatEntitlement]}
        updateQuantity={() => {}}
      />,
    );

    expect(
      screen.getByText("6 User Seats × 100 = 600 Credits/mo"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/more Credits today/)).not.toBeInTheDocument();
  });

  it("renders no credits section without a per-license grant", () => {
    render(
      <Quantity
        isLoading={false}
        period="month"
        selectedPlan={makePlan({ includedCreditGrants: [] })}
        entitlements={[seatEntitlement]}
        updateQuantity={() => {}}
      />,
    );

    expect(screen.queryByText("Credits included")).not.toBeInTheDocument();
  });
});
