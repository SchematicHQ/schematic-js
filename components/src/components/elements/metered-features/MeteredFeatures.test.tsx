import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  BillingCreditGrantReason,
  type BillingCreditBundleView,
  type CreditCompanyGrantView,
} from "../../../api/checkoutexternal";
import { defaultSettings } from "../../../context";
import { render } from "../../../test/setup";
import { toPrettyDate } from "../../../utils";

import { MeteredFeatures } from "./MeteredFeatures";

const CREDIT_ID = "token-credit";
const PLAN_ID = "plan-1";

const state = vi.hoisted(() => ({
  creditGrants: [] as unknown[],
  creditBundles: [] as unknown[],
  planId: undefined as string | undefined,
  canCheckout: false,
}));

vi.mock("../../../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks")>();
  return {
    ...actual,
    useEmbed: () => ({
      data: {
        company: { plan: { id: state.planId, includedCreditGrants: [] } },
        featureUsage: { features: [] },
        creditGrants: state.creditGrants,
        creditBundles: state.creditBundles,
        capabilities: { checkout: state.canCheckout },
        displaySettings: { showCredits: true },
      },
      settings: defaultSettings,
      setCheckoutState: vi.fn(),
      // `UsageByUser` fetches on mount; these tests assert on the credit
      // ledger, so resolve empty and let it render nothing.
      getCreditUsageByUser: vi.fn(() => Promise.resolve(undefined)),
      getFeatureUsageByUser: vi.fn(() => Promise.resolve(undefined)),
    }),
    useIsLightBackground: () => true,
    useWrapChildren: () => ({ ref: { current: null }, isWrapped: false }),
  };
});

// All grants share a `billingCreditId`, so `aggregateActiveGrantsByCredit`
// collapses them into a single ledger.
const createGrant = (index: number): CreditCompanyGrantView =>
  ({
    id: `grant-${index}`,
    billingCreditId: CREDIT_ID,
    billingCreditBundleId: `bundle-${index}`,
    creditName: "Tokens",
    creditDescription: "",
    creditIcon: "bolt",
    singularName: "credit",
    pluralName: "credits",
    grantReason: BillingCreditGrantReason.Purchased,
    quantity: 100,
    quantityRemaining: 100,
    quantityUsed: 0,
    createdAt: new Date(2026, 0, index + 1),
    expiresAt: null,
    zeroedOutDate: null,
  }) as unknown as CreditCompanyGrantView;

const grantsFor = (count: number) =>
  Array.from({ length: count }, (_, index) => createGrant(index));

const createBundle = (
  creditId: string,
  compatiblePlanIds: string[] = [],
): BillingCreditBundleView =>
  ({
    id: `bundle-${creditId}`,
    creditId,
    compatiblePlanIds,
    name: "1,000 tokens",
    quantity: 1000,
  }) as unknown as BillingCreditBundleView;

const grantRows = () => screen.queryAllByText(/bundle purchased/);

beforeEach(() => {
  state.creditGrants = [];
  state.creditBundles = [];
  state.planId = undefined;
  state.canCheckout = false;
});

describe("`MeteredFeatures` grant ledger truncation", () => {
  test("keeps the ledger toggle out of reach until balance details open", () => {
    state.creditGrants = grantsFor(18);

    render(<MeteredFeatures />);

    expect(screen.getByText("See balance details")).toBeInTheDocument();
    // The rows and their toggle are rendered but hidden inside the collapsed
    // TransitionBox, so assert on the balance-details control instead.
    expect(screen.queryByText("Hide balance details")).not.toBeInTheDocument();
  });

  test("caps the open ledger at the visible limit", () => {
    state.creditGrants = grantsFor(18);

    render(<MeteredFeatures />);
    fireEvent.click(screen.getByText("See balance details"));

    expect(grantRows()).toHaveLength(3);
    expect(screen.getByText("See all (18)")).toBeInTheDocument();
  });

  test("orders the ledger newest-first", () => {
    state.creditGrants = grantsFor(18);

    render(<MeteredFeatures />);
    fireEvent.click(screen.getByText("See balance details"));

    // `createGrant` dates ascend with the index, so grant 18 is the newest.
    const expected = [17, 16, 15].map((index) =>
      toPrettyDate(new Date(2026, 0, index + 1), {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }),
    );

    expect(grantRows().map((node) => node.textContent)).toEqual(
      expected.map((date) => `100 credit bundle purchased ${date}`),
    );
  });

  test("expands to every grant and collapses back", () => {
    state.creditGrants = grantsFor(18);

    render(<MeteredFeatures />);
    fireEvent.click(screen.getByText("See balance details"));

    fireEvent.click(screen.getByText("See all (18)"));
    expect(grantRows()).toHaveLength(18);
    expect(screen.getByText("Hide all")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Hide all"));
    expect(grantRows()).toHaveLength(3);
  });

  test("resets the ledger when balance details are closed and reopened", () => {
    state.creditGrants = grantsFor(18);

    render(<MeteredFeatures />);
    fireEvent.click(screen.getByText("See balance details"));
    fireEvent.click(screen.getByText("See all (18)"));
    expect(grantRows()).toHaveLength(18);

    fireEvent.click(screen.getByText("Hide balance details"));
    fireEvent.click(screen.getByText("See balance details"));

    expect(grantRows()).toHaveLength(3);
    expect(screen.getByText("See all (18)")).toBeInTheDocument();
  });

  test("renders no ledger toggle when the grant count is at the limit", () => {
    state.creditGrants = grantsFor(3);

    render(<MeteredFeatures />);
    fireEvent.click(screen.getByText("See balance details"));

    expect(grantRows()).toHaveLength(3);
    expect(screen.queryByText(/See all/)).not.toBeInTheDocument();
  });
});

describe("`MeteredFeatures` credit `Buy More`", () => {
  beforeEach(() => {
    state.creditGrants = grantsFor(1);
    state.planId = PLAN_ID;
    state.canCheckout = true;
  });

  test("shows `Buy More` when a purchasable bundle exists for the credit", () => {
    state.creditBundles = [createBundle(CREDIT_ID)];

    render(<MeteredFeatures />);

    expect(screen.getByText("Buy More")).toBeInTheDocument();
  });

  test("hides `Buy More` when the catalog has no bundle for the credit", () => {
    // Bundles created on the Credit Type page but never added under
    // Catalog -> Configuration -> Credit Bundles never reach hydrate, so the
    // Credits stage would have nothing to show — and it is not registered as a
    // stage in that case, leaving no breadcrumb to navigate away from.
    state.creditBundles = [];

    render(<MeteredFeatures />);

    // The credit row itself still renders — only the dead-end CTA is gone.
    expect(screen.getAllByText("Tokens").length).toBeGreaterThan(0);
    expect(screen.queryByText("Buy More")).not.toBeInTheDocument();
  });

  test("hides `Buy More` when the only bundles are for other credits", () => {
    state.creditBundles = [createBundle("other-credit")];

    render(<MeteredFeatures />);

    expect(screen.queryByText("Buy More")).not.toBeInTheDocument();
  });

  test("hides `Buy More` when no bundle is compatible with the current plan", () => {
    state.creditBundles = [createBundle(CREDIT_ID, ["other-plan"])];

    render(<MeteredFeatures />);

    expect(screen.queryByText("Buy More")).not.toBeInTheDocument();
  });

  test("hides `Buy More` when checkout is not available", () => {
    state.creditBundles = [createBundle(CREDIT_ID)];
    state.canCheckout = false;

    render(<MeteredFeatures />);

    expect(screen.queryByText("Buy More")).not.toBeInTheDocument();
  });
});
