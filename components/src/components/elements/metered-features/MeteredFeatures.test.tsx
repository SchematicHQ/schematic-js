import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  BillingCreditGrantReason,
  type CreditCompanyGrantView,
} from "../../../api/checkoutexternal";
import { defaultSettings } from "../../../context";
import { render } from "../../../test/setup";
import { toPrettyDate } from "../../../utils";

import { MeteredFeatures } from "./MeteredFeatures";

const state = vi.hoisted(() => ({
  creditGrants: [] as unknown[],
}));

vi.mock("../../../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks")>();
  return {
    ...actual,
    useEmbed: () => ({
      data: {
        company: { plan: { includedCreditGrants: [] } },
        featureUsage: { features: [] },
        creditGrants: state.creditGrants,
        capabilities: { checkout: false },
        displaySettings: { showCredits: true },
      },
      settings: defaultSettings,
      setCheckoutState: vi.fn(),
    }),
    useIsLightBackground: () => true,
    useWrapChildren: () => ({ ref: { current: null }, isWrapped: false }),
  };
});

// All grants share a `billingCreditId`, so `groupCreditGrants({groupBy:
// "credit"})` collapses them into a single ledger.
const createGrant = (index: number): CreditCompanyGrantView =>
  ({
    id: `grant-${index}`,
    billingCreditId: "token-credit",
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

const grantRows = () => screen.queryAllByText(/bundle purchased/);

beforeEach(() => {
  state.creditGrants = [];
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
