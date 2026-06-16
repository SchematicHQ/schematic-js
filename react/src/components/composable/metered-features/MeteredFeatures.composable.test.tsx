import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { type FeatureUsageResponseData } from "../../api/checkoutexternal";

import {
  MeteredFeatures,
  MeteredFeaturesContext,
  type MeteredCreditGroup,
  type MeteredFeaturesContextValue,
} from ".";

const features = [
  { feature: { id: "f1", name: "Feature 1" } },
  { feature: { id: "f2", name: "Feature 2" } },
] as FeatureUsageResponseData[];

const creditGroup = {
  id: "c1",
  name: "Credits",
  total: { used: 1, value: 10 },
  grants: [],
} as unknown as MeteredCreditGroup;

function withContext(
  ui: React.ReactNode,
  overrides: Partial<MeteredFeaturesContextValue> = {},
) {
  const value: MeteredFeaturesContextValue = {
    meteredFeatures: features,
    creditGroups: [creditGroup],
    shouldShow: true,
    period: "month",
    canCheckout: true,
    showCredits: true,
    isCreditExpanded: () => false,
    toggleBalanceDetails: vi.fn(),
    addUsage: vi.fn(),
    buyCredits: vi.fn(),
    ...overrides,
  };
  return render(
    <MeteredFeaturesContext.Provider value={value}>
      {ui}
    </MeteredFeaturesContext.Provider>,
  );
}

describe("MeteredFeatures primitives", () => {
  test("Features maps over the metered features", () => {
    withContext(
      <MeteredFeatures.Features>
        {(entitlement) => (
          <div key={entitlement.feature?.id}>{entitlement.feature?.name}</div>
        )}
      </MeteredFeatures.Features>,
    );
    expect(screen.getByText("Feature 1")).toBeInTheDocument();
    expect(screen.getByText("Feature 2")).toBeInTheDocument();
  });

  test("Credits exposes expand state and is gated on showCredits", () => {
    const toggle = vi.fn();
    const { rerender } = withContext(
      <MeteredFeatures.Credits>
        {(credit, { toggle }) => (
          <button key={credit.id} onClick={toggle}>
            {credit.name}
          </button>
        )}
      </MeteredFeatures.Credits>,
      { toggleBalanceDetails: toggle },
    );

    fireEvent.click(screen.getByText("Credits"));
    expect(toggle).toHaveBeenCalledWith("c1");

    rerender(
      <MeteredFeaturesContext.Provider
        value={{
          meteredFeatures: features,
          creditGroups: [creditGroup],
          shouldShow: true,
          period: "month",
          canCheckout: true,
          showCredits: false,
          isCreditExpanded: () => false,
          toggleBalanceDetails: toggle,
          addUsage: vi.fn(),
          buyCredits: vi.fn(),
        }}
      >
        <MeteredFeatures.Credits>
          {(credit) => <span key={credit.id}>{credit.name}</span>}
        </MeteredFeatures.Credits>
      </MeteredFeaturesContext.Provider>,
    );
    expect(screen.queryByText("Credits")).not.toBeInTheDocument();
  });

  test("Empty renders only when there is nothing to show", () => {
    withContext(<MeteredFeatures.Empty>nothing</MeteredFeatures.Empty>, {
      shouldShow: false,
    });
    expect(screen.getByText("nothing")).toBeInTheDocument();
  });

  test("useMeteredFeatures throws outside Root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<MeteredFeatures.Features>{() => null}</MeteredFeatures.Features>),
    ).toThrow(/must be rendered inside/);
    spy.mockRestore();
  });
});
