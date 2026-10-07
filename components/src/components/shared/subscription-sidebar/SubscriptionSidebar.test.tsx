import { screen } from "@testing-library/react";
import { vi } from "vitest";

import {
  ComponentHydrateResponseDataFromJSON,
  PlanEntitlementResponseDataFromJSON,
} from "../../../api/checkoutexternal";
import { EmbedContext, initialContext } from "../../../context";
import hydrateResponse from "../../../test/mocks/handlers/response/hydrate.json";
import { render } from "../../../test/setup";
import type {
  CreditBundle,
  SelectedPlan,
  UsageBasedEntitlement,
} from "../../../types";

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

/**
 * A seat-style pay-in-advance entitlement on a graduated tiered price: the
 * first seat is included and every seat after it costs $250. Tiered prices
 * leave the parent `price` at 0 and carry the real amounts on `price_tier`,
 * which is what made the total drop the charge entirely.
 */
function buildTieredPayInAdvanceEntitlement(
  quantity: number,
): UsageBasedEntitlement {
  const entitlement = PlanEntitlementResponseDataFromJSON({
    id: "pltl_tiered_seats",
    environment_id: "env_66p5iXPxRJU",
    created_at: "2025-10-01T15:45:30.611471Z",
    updated_at: "2025-10-01T15:45:30.611471Z",
    currency_prices: [],
    feature_id: "feat_tiered_seats",
    feature: {
      id: "feat_tiered_seats",
      created_at: "2025-10-01T14:42:58.193974Z",
      updated_at: "2025-10-01T14:42:58.193974Z",
      environment_id: "env_66p5iXPxRJU",
      feature_type: "trait",
      name: "Advanced Analytics Seat",
      plural_name: "advanced analytics seats",
      singular_name: "advanced analytics seat",
    },
    plan_id: "plan_6Nne9wATKg2",
    price_behavior: "pay_in_advance",
    value_type: "numeric",
    value_numeric: 0,
    warning_tiers: [],
    metered_monthly_price: {
      id: "bilpp_tiered_seats",
      billing_scheme: "tiered",
      created_at: "2025-10-01T15:45:30.539441Z",
      currency: "usd",
      interval: "month",
      is_active: true,
      package_size: 1,
      price: 0,
      price_decimal: "0",
      price_external_id: "price_tiered_seats",
      price_id: "bilpp_tiered_seats",
      price_tier: [
        {
          flat_amount: null,
          per_unit_price: 0,
          per_unit_price_decimal: null,
          up_to: 1,
        },
        {
          flat_amount: null,
          per_unit_price: 25000,
          per_unit_price_decimal: "25000",
          up_to: null,
        },
      ],
      product_external_id: "prod_tiered_seats",
      product_id: "bilp_tiered_seats",
      product_name: "Advanced Analytics Seat",
      scheme: "tiered",
      usage_type: "licensed",
    },
  });

  return { ...entitlement, allocation: 0, usage: 0, quantity };
}

/**
 * A fixture plan as the plan being checked out. Basic ($5.00/mo) is the
 * company's current plan.
 */
function buildSelectedPlan(name = "Basic"): SelectedPlan {
  const plan = ComponentHydrateResponseDataFromJSON(
    structuredClone(hydrateResponse.data),
  ).activePlans.find((activePlan) => activePlan.name === name)!;

  return { ...plan, isSelected: true };
}

/** The fixture's credit bundle with `count` of it added to the checkout. */
function buildCreditBundles(count: number): CreditBundle[] {
  return ComponentHydrateResponseDataFromJSON(
    structuredClone(hydrateResponse.data),
  ).creditBundles.map((bundle) => ({ ...bundle, count }));
}

function renderSidebar(
  addOns: SelectedPlan[],
  usageBasedEntitlements: UsageBasedEntitlement[] = [],
  selectedPlan?: SelectedPlan,
  {
    currency,
    hydrateData = structuredClone(hydrateResponse.data),
    planPeriod = "month",
    creditBundles,
    checkoutStage,
  }: {
    currency?: string;
    hydrateData?: unknown;
    planPeriod?: string;
    creditBundles?: CreditBundle[];
    checkoutStage?: string;
  } = {},
) {
  return render(
    <EmbedContext.Provider
      value={{
        ...initialContext,
        data: ComponentHydrateResponseDataFromJSON(hydrateData),
        layout: "checkout",
        setLayout: () => {},
        setCheckoutState: () => {},
        clearCheckoutState: () => {},
        debug: () => {},
      }}
    >
      <SubscriptionSidebar
        planPeriod={planPeriod}
        selectedPlan={selectedPlan}
        addOns={addOns}
        creditBundles={creditBundles}
        checkoutStage={checkoutStage}
        usageBasedEntitlements={usageBasedEntitlements}
        isLoading={false}
        isPaymentMethodRequired={false}
        setError={() => {}}
        setIsLoading={() => {}}
        setConfirmPaymentIntent={() => {}}
        currency={currency}
      />
    </EmbedContext.Provider>,
  );
}

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

describe("`SubscriptionSidebar` one-time add-ons", () => {
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

describe("`SubscriptionSidebar` tiered pay-in-advance entitlements", () => {
  // The selected plan is $5.00/mo, so the total is that plus whatever the
  // tiered seats contribute: 1 seat included + 3 × $250.00.
  it("adds the tiered cost of the chosen quantity to the total", () => {
    renderSidebar(
      [],
      [buildTieredPayInAdvanceEntitlement(4)],
      buildSelectedPlan(),
    );

    expect(
      screen.getByText(/You will be billed \$755\.00/),
    ).toBeInTheDocument();
  });

  it("prices the tiered entitlement's own line rather than leaving it blank", () => {
    renderSidebar(
      [],
      [buildTieredPayInAdvanceEntitlement(4)],
      buildSelectedPlan(),
    );

    expect(screen.getByText("4 advanced analytics seats")).toBeInTheDocument();
    expect(screen.getByText("$750.00")).toBeInTheDocument();
    expect(screen.getByText("Tier-based")).toBeInTheDocument();
  });

  it("leaves the total alone when no quantity is selected", () => {
    renderSidebar(
      [],
      [buildTieredPayInAdvanceEntitlement(0)],
      buildSelectedPlan(),
    );

    expect(screen.getByText(/You will be billed \$5\.00/)).toBeInTheDocument();
  });
});

describe("`SubscriptionSidebar` total currency", () => {
  function hydrateWithCompany(company: Json) {
    const raw = structuredClone(hydrateResponse.data) as unknown as Json;
    raw.company = { ...(raw.company as Json), ...company };
    return raw;
  }

  it("formats the total in the checkout currency when no plan is selected", () => {
    renderSidebar([], [], undefined, {
      currency: "EUR",
      hydrateData: hydrateWithCompany({ plan: null }),
    });

    expect(screen.getByText(/You will be billed €0\.00/)).toBeInTheDocument();
  });

  it("formats the current plan's total in its subscription currency", () => {
    const raw = hydrateWithCompany({});
    const company = raw.company as Json;
    company.billing_subscription = {
      ...(company.billing_subscription as Json),
      currency: "eur",
    };

    renderSidebar([], [], undefined, { currency: "EUR", hydrateData: raw });

    expect(screen.getByText(/You will be billed €5\.00/)).toBeInTheDocument();
  });
});

describe("`SubscriptionSidebar` checkout button label", () => {
  // The button only renders on a checkout stage.
  const checkoutStage = "checkout";

  // The sidebar renders the button inline and again as a sticky footer.
  const expectLabel = (label: string, otherLabel: string) => {
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.queryByText(otherLabel)).not.toBeInTheDocument();
  };

  const withOnlyOneTimeSelected = () =>
    buildAddOns().map((addOn) => ({
      ...addOn,
      isSelected: addOn.id === ONE_TIME_ADD_ON_ID,
    }));

  it("says 'Pay and close' when only a one-time add-on is bought on the current plan", () => {
    renderSidebar(withOnlyOneTimeSelected(), [], buildSelectedPlan(), {
      checkoutStage,
    });

    expectLabel("Pay and close", "Subscribe and close");
  });

  it("says 'Pay and close' when only credit bundles are bought on the current plan", () => {
    renderSidebar([], [], buildSelectedPlan(), {
      creditBundles: buildCreditBundles(1),
      checkoutStage,
    });

    expectLabel("Pay and close", "Subscribe and close");
  });

  it("says 'Subscribe and close' when a recurring add-on is also added", () => {
    renderSidebar(buildAddOns(), [], buildSelectedPlan(), { checkoutStage });

    expectLabel("Subscribe and close", "Pay and close");
  });

  it("says 'Subscribe and close' when the plan changes", () => {
    renderSidebar(
      withOnlyOneTimeSelected(),
      [],
      buildSelectedPlan("Standard"),
      {
        checkoutStage,
      },
    );

    expectLabel("Subscribe and close", "Pay and close");
  });

  it("says 'Subscribe and close' when the billing period changes", () => {
    renderSidebar(withOnlyOneTimeSelected(), [], buildSelectedPlan(), {
      planPeriod: "year",
      checkoutStage,
    });

    expectLabel("Subscribe and close", "Pay and close");
  });

  it("says 'Subscribe and close' when nothing one-time is bought", () => {
    renderSidebar([], [], buildSelectedPlan(), { checkoutStage });

    expectLabel("Subscribe and close", "Pay and close");
  });
});
