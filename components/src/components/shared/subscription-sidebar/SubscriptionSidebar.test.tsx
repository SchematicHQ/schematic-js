import { screen } from "@testing-library/react";
import { vi } from "vitest";

import { ComponentHydrateResponseDataFromJSON } from "../../../api/checkoutexternal";
import { EmbedContext, initialContext } from "../../../context";
import hydrateResponse from "../../../test/mocks/handlers/response/hydrate.json";
import { render } from "../../../test/setup";
import type { SelectedPlan } from "../../../types";

import { SubscriptionSidebar } from "./SubscriptionSidebar";

type Json = Record<string, unknown>;

const ONE_TIME_ADD_ON_ID = "plan_one_time";

/**
 * The fixture ships two recurring add-ons; the second becomes a one-time
 * charge so both flavors are selected at once.
 */
function buildAddOns(): SelectedPlan[] {
  const raw = structuredClone(hydrateResponse.data) as unknown as Json;
  const addOns = raw.active_add_ons as Json[];

  addOns[1] = {
    ...addOns[1],
    id: ONE_TIME_ADD_ON_ID,
    name: "Onboarding",
    charge_type: "one_time",
    monthly_price: null,
    quarterly_price: null,
    yearly_price: null,
    currency_prices: [],
    one_time_price: {
      currency: "usd",
      external_price_id: "price_onboarding",
      id: "bilpp_onboarding",
      interval: "one-time",
      price: 25000,
      price_decimal: "25000",
      provider_type: "stripe",
      scheme: "per_unit",
    },
  };

  return ComponentHydrateResponseDataFromJSON(raw).activeAddOns.map(
    (addOn) => ({ ...addOn, isSelected: true }),
  );
}

function renderSidebar(addOns: SelectedPlan[]) {
  return render(
    <EmbedContext.Provider
      value={{
        ...initialContext,
        data: ComponentHydrateResponseDataFromJSON(
          structuredClone(hydrateResponse.data),
        ),
        layout: "checkout",
        setLayout: () => {},
        setCheckoutState: () => {},
        clearCheckoutState: () => {},
        debug: () => {},
      }}
    >
      <SubscriptionSidebar
        planPeriod="month"
        addOns={addOns}
        usageBasedEntitlements={[]}
        isLoading={false}
        isPaymentMethodRequired={false}
        setError={() => {}}
        setIsLoading={() => {}}
        setConfirmPaymentIntent={() => {}}
      />
    </EmbedContext.Provider>,
  );
}

describe("`SubscriptionSidebar` one-time add-ons", () => {
  beforeAll(() => {
    // jsdom does not implement this, and the sidebar observes its button.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("lists a selected one-time add-on under its own heading", () => {
    renderSidebar(buildAddOns());

    const heading = screen.getByText("One-time charges");
    expect(heading).toBeInTheDocument();

    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(screen.getByText("$250.00")).toBeInTheDocument();
  });

  it("keeps recurring add-ons in the add-ons section", () => {
    renderSidebar(buildAddOns());

    expect(screen.getByText("Add-ons")).toBeInTheDocument();
    expect(screen.getByText("Simple Add-on")).toBeInTheDocument();
  });

  it("renders no one-time section when no one-time add-on is selected", () => {
    const addOns = buildAddOns().map((addOn) =>
      addOn.id === ONE_TIME_ADD_ON_ID ? { ...addOn, isSelected: false } : addOn,
    );

    renderSidebar(addOns);

    expect(screen.queryByText("One-time charges")).not.toBeInTheDocument();
  });
});
