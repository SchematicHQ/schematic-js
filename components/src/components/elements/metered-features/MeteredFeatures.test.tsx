import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { defaultSettings } from "../../../context/embedState";
import { render } from "../../../test/setup";

import { MeteredFeatures } from "./MeteredFeatures";

const CREDIT_ID = "bilcr_tokens";

function creditGrant() {
  return {
    id: "bilcrg_1",
    billingCreditId: CREDIT_ID,
    creditName: "Tokens",
    singularName: "token",
    pluralName: "tokens",
    creditDescription: "Tokens",
    grantReason: "plan",
    quantity: 100,
    quantityRemaining: 40,
    quantityUsed: 60,
    companyId: "comp_1",
    companyName: "Acme",
    planId: "plan_1",
    planName: "Pro",
  };
}

// Referentially-stable embed object: swapped wholesale per test via `setData`.
const state = vi.hoisted(() => {
  const embed = {
    data: {} as Record<string, unknown>,
    settings: {} as Record<string, unknown>,
    setCheckoutState: vi.fn(),
    warningThresholdConfig: undefined,
  };

  return { embed };
});

vi.mock("../../../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks")>();

  return {
    ...actual,
    useEmbed: () => state.embed,
    useWrapChildren: () => false,
  };
});

function setData(overrides: {
  creditBundles?: { id: string; creditId: string }[];
  includedCreditGrants?: {
    creditId: string;
    billingCreditCanBuyBundles?: boolean;
  }[];
}) {
  state.embed.data = {
    capabilities: { checkout: true },
    displaySettings: { showCredits: true },
    featureUsage: { features: [] },
    creditGrants: [creditGrant()],
    creditBundles: overrides.creditBundles ?? [],
    company: {
      plan: { includedCreditGrants: overrides.includedCreditGrants ?? [] },
    },
  };
}

beforeEach(() => {
  state.embed.settings = defaultSettings;
  state.embed.setCheckoutState.mockClear();
  setData({});
});

describe("`MeteredFeatures` credit `Buy More`", () => {
  test("hides `Buy More` when the catalog has no bundle for the credit", () => {
    // Bundles created on the Credit Type page but never added under
    // Catalog -> Configuration -> Credit Bundles never reach hydrate, so the
    // Credits stage would have nothing to show.
    setData({
      creditBundles: [],
      includedCreditGrants: [
        { creditId: CREDIT_ID, billingCreditCanBuyBundles: true },
      ],
    });

    render(<MeteredFeatures />);

    // The credit row itself still renders — only the dead-end CTA is gone.
    expect(screen.getAllByText("Tokens").length).toBeGreaterThan(0);
    expect(screen.queryByText("Buy More")).not.toBeInTheDocument();
  });

  test("shows `Buy More` when a purchasable bundle exists for the credit", () => {
    setData({
      creditBundles: [{ id: "bilcrb_1", creditId: CREDIT_ID }],
      includedCreditGrants: [
        { creditId: CREDIT_ID, billingCreditCanBuyBundles: true },
      ],
    });

    render(<MeteredFeatures />);

    expect(screen.getByText("Buy More")).toBeInTheDocument();
  });

  test("hides `Buy More` when the only bundles are for other credits", () => {
    setData({
      creditBundles: [{ id: "bilcrb_2", creditId: "bilcr_other" }],
      includedCreditGrants: [
        { creditId: CREDIT_ID, billingCreditCanBuyBundles: true },
      ],
    });

    render(<MeteredFeatures />);

    expect(screen.queryByText("Buy More")).not.toBeInTheDocument();
  });

  test("hides `Buy More` when the plan grant disallows bundle purchases", () => {
    setData({
      creditBundles: [{ id: "bilcrb_1", creditId: CREDIT_ID }],
      includedCreditGrants: [
        { creditId: CREDIT_ID, billingCreditCanBuyBundles: false },
      ],
    });

    render(<MeteredFeatures />);

    expect(screen.queryByText("Buy More")).not.toBeInTheDocument();
  });

  test("hides `Buy More` when checkout is not available", () => {
    setData({
      creditBundles: [{ id: "bilcrb_1", creditId: CREDIT_ID }],
      includedCreditGrants: [
        { creditId: CREDIT_ID, billingCreditCanBuyBundles: true },
      ],
    });
    (state.embed.data as { capabilities: { checkout: boolean } }).capabilities =
      { checkout: false };

    render(<MeteredFeatures />);

    expect(screen.queryByText("Buy More")).not.toBeInTheDocument();
  });
});
