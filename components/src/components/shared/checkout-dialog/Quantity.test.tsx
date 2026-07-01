import { screen } from "@testing-library/react";

import { render } from "../../../test/setup";
import type { UsageBasedEntitlement } from "../../../types";

import { Quantity } from "./Quantity";

type EntitlementOverrides = Partial<Omit<UsageBasedEntitlement, "feature">> & {
  feature?: { id: string; name: string };
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
