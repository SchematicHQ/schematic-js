import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  BillingCreditGrantReason,
  type CreditCompanyGrantView,
} from "../../../api/checkoutexternal";
import { defaultSettings } from "../../../context";
import { render } from "../../../test/setup";

import { PlanManager } from "./PlanManager";

const state = vi.hoisted(() => ({
  creditGrants: [] as unknown[],
  includedCreditGrants: [] as unknown[],
}));

vi.mock("../../../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks")>();
  return {
    ...actual,
    useEmbed: () => ({
      data: {
        company: {
          plan: {
            id: "plan-1",
            name: "Pro",
            planPrice: 5000,
            planPeriod: "month",
            includedCreditGrants: state.includedCreditGrants,
          },
          addOns: [],
        },
        creditBundles: [],
        creditGrants: state.creditGrants,
        capabilities: { checkout: false },
        displaySettings: { showCredits: true },
      },
      settings: defaultSettings,
      setCheckoutState: vi.fn(),
      setLayout: vi.fn(),
    }),
    useIsLightBackground: () => true,
    useTrialEnd: () => undefined,
    useCustomPlanBilling: () => undefined,
  };
});

/**
 * Plan grants key on credit id (`aggregateActiveGrantsByCredit`); every other
 * grant keys on bundle id, falling back to grant id
 * (`aggregateActiveGrantsByBundle`). Distinct ids here yield one row per grant.
 */
const createGrant = (
  index: number,
  grantReason: BillingCreditGrantReason,
  creditName: string,
  overrides: Partial<CreditCompanyGrantView> = {},
): CreditCompanyGrantView =>
  ({
    id: `${grantReason}-grant-${index}`,
    billingCreditId: `${grantReason}-${creditName}-credit-${index}`,
    billingCreditBundleId: `${grantReason}-bundle-${index}`,
    creditName,
    singularName: "credit",
    pluralName: "credits",
    grantReason,
    quantity: (index + 1) * 100,
    quantityRemaining: (index + 1) * 100,
    quantityUsed: 0,
    createdAt: new Date(2026, 0, index + 1),
    expiresAt: null,
    zeroedOutDate: null,
    ...overrides,
  }) as unknown as CreditCompanyGrantView;

const grantsFor = (
  count: number,
  grantReason: BillingCreditGrantReason,
  creditName: string,
  overrides: (index: number) => Partial<CreditCompanyGrantView> = () => ({}),
) =>
  Array.from({ length: count }, (_, index) =>
    createGrant(index, grantReason, creditName, overrides(index)),
  );

const sectionFor = (heading: string) => {
  const label = screen.getByText(heading);
  // The section wrapper holds the label, the list, and the toggle.
  return label.parentElement as HTMLElement;
};

beforeEach(() => {
  state.creditGrants = [];
  state.includedCreditGrants = [];
});

describe("`PlanManager` credit list truncation", () => {
  test("caps a credit section at the visible limit and reports the total", () => {
    state.creditGrants = grantsFor(5, BillingCreditGrantReason.Plan, "Token");

    render(<PlanManager />);

    const section = sectionFor("Credits in plan");
    expect(within(section).getAllByText(/^\d+ credits$/)).toHaveLength(3);
    expect(within(section).getByText("See all (5)")).toBeInTheDocument();
  });

  test("shows the most recent bundle entries, newest first", () => {
    // `createGrant` dates ascend with the index, so grant 5 (500 credits) is
    // the newest and grant 1 (100 credits) the oldest.
    state.creditGrants = grantsFor(
      5,
      BillingCreditGrantReason.Purchased,
      "Token",
    );

    render(<PlanManager />);

    const section = sectionFor("Credit bundles");
    expect(
      within(section)
        .getAllByText(/^\d+ credits$/)
        .map((node) => node.textContent?.trim()),
    ).toEqual(["500 credits", "400 credits", "300 credits"]);
  });

  test("orders plan credits by the plan's own grant order, not by recency", () => {
    const grants = grantsFor(5, BillingCreditGrantReason.Plan, "Token");
    state.creditGrants = grants;
    // The plan lists its credits newest-ledger-entry last, so a recency sort
    // would reverse this and drop the plan's first credits out of the
    // collapsed view.
    state.includedCreditGrants = grants.map((grant) => ({
      creditId: grant.billingCreditId,
    }));

    render(<PlanManager />);

    const section = sectionFor("Credits in plan");
    expect(
      within(section)
        .getAllByText(/^\d+ credits$/)
        .map((node) => node.textContent?.trim()),
    ).toEqual(["100 credits", "200 credits", "300 credits"]);
  });

  test("sorts plan credits the plan no longer defines to the end", () => {
    const grants = grantsFor(3, BillingCreditGrantReason.Plan, "Token");
    state.creditGrants = grants;
    state.includedCreditGrants = [
      { creditId: grants[2].billingCreditId },
      { creditId: grants[0].billingCreditId },
    ];

    render(<PlanManager />);

    const section = sectionFor("Credits in plan");
    expect(
      within(section)
        .getAllByText(/^\d+ credits$/)
        .map((node) => node.textContent?.trim()),
    ).toEqual(["300 credits", "100 credits", "200 credits"]);
  });

  test("expands to the full list and collapses back", () => {
    state.creditGrants = grantsFor(5, BillingCreditGrantReason.Plan, "Token");

    render(<PlanManager />);

    const section = sectionFor("Credits in plan");

    fireEvent.click(within(section).getByText("See all (5)"));
    expect(within(section).getAllByText(/^\d+ credits$/)).toHaveLength(5);

    fireEvent.click(within(section).getByText("Hide all"));
    expect(within(section).getAllByText(/^\d+ credits$/)).toHaveLength(3);
  });

  test("renders no toggle when the section is at the limit", () => {
    state.creditGrants = grantsFor(3, BillingCreditGrantReason.Plan, "Token");

    render(<PlanManager />);

    expect(screen.queryByText(/See all/)).not.toBeInTheDocument();
  });

  test("expands each section independently", () => {
    state.creditGrants = [
      ...grantsFor(5, BillingCreditGrantReason.Plan, "Token"),
      ...grantsFor(5, BillingCreditGrantReason.Free, "Token"),
    ];

    render(<PlanManager />);

    const planSection = sectionFor("Credits in plan");
    const promotionalSection = sectionFor("Promotional credits");

    fireEvent.click(within(planSection).getByText("See all (5)"));

    expect(within(planSection).getAllByText(/^\d+ credits$/)).toHaveLength(5);
    expect(
      within(promotionalSection).getAllByText(/^\d+ credits$/),
    ).toHaveLength(3);
    expect(
      within(promotionalSection).getByText("See all (5)"),
    ).toBeInTheDocument();
  });

  test("counts every group across multiple credits in one section", () => {
    state.creditGrants = [
      ...grantsFor(3, BillingCreditGrantReason.Purchased, "Token"),
      ...grantsFor(
        2,
        BillingCreditGrantReason.Purchased,
        "API Call",
        (index) => ({
          id: `api-grant-${index}`,
          billingCreditBundleId: `api-bundle-${index}`,
        }),
      ),
    ];

    render(<PlanManager />);

    expect(screen.getByText("See all (5)")).toBeInTheDocument();
  });
});

describe("`PlanManager` auto top-up section", () => {
  const autoTopups = (
    count: number,
    overrides: (index: number) => Partial<CreditCompanyGrantView> = () => ({}),
  ) =>
    grantsFor(
      count,
      BillingCreditGrantReason.BillingCreditAutoTopup,
      "Token",
      overrides,
    );

  test("renders auto top-up grants below the plan credits section", () => {
    state.creditGrants = [
      ...grantsFor(1, BillingCreditGrantReason.Plan, "Token"),
      ...autoTopups(2),
    ];

    render(<PlanManager />);

    const headings = screen
      .getAllByText(/^(Credits in plan|Top-ups)$/)
      .map((node) => node.textContent);

    expect(headings).toEqual(["Credits in plan", "Top-ups"]);
    expect(
      within(sectionFor("Top-ups")).getAllByText(/^\d+ credits$/),
    ).toHaveLength(2);
  });

  test("omits the section when there are no auto top-up grants", () => {
    state.creditGrants = grantsFor(2, BillingCreditGrantReason.Plan, "Token");

    render(<PlanManager />);

    expect(screen.queryByText("Top-ups")).not.toBeInTheDocument();
  });

  test("includes auto top-up grants regardless of when they were created", () => {
    state.creditGrants = autoTopups(4, (index) => ({
      createdAt: new Date(2020, 0, index + 1),
    }));

    render(<PlanManager />);

    const section = sectionFor("Top-ups");
    expect(within(section).getByText("See all (4)")).toBeInTheDocument();
  });

  test("truncates and expands independently of the other sections", () => {
    state.creditGrants = [
      ...grantsFor(5, BillingCreditGrantReason.Plan, "Token"),
      ...autoTopups(5),
    ];

    render(<PlanManager />);

    const topupSection = sectionFor("Top-ups");
    const planSection = sectionFor("Credits in plan");

    expect(within(topupSection).getAllByText(/^\d+ credits$/)).toHaveLength(3);

    fireEvent.click(within(topupSection).getByText("See all (5)"));

    expect(within(topupSection).getAllByText(/^\d+ credits$/)).toHaveLength(5);
    expect(within(planSection).getAllByText(/^\d+ credits$/)).toHaveLength(3);
  });

  test("keeps a bundle bought outright out of the top-ups section", () => {
    // Same bundle, two ways of acquiring it. Merged into one entry, the pair
    // would land in whichever section the last grant's reason picked.
    state.creditGrants = [
      createGrant(0, BillingCreditGrantReason.Purchased, "Token", {
        billingCreditBundleId: "shared-bundle",
      }),
      createGrant(1, BillingCreditGrantReason.BillingCreditAutoTopup, "Token", {
        billingCreditBundleId: "shared-bundle",
      }),
    ];

    render(<PlanManager />);

    expect(
      within(sectionFor("Top-ups"))
        .getAllByText(/^\d+ credits$/)
        .map((node) => node.textContent?.trim()),
    ).toEqual(["200 credits"]);
    expect(
      within(sectionFor("Credit bundles"))
        .getAllByText(/^\d+ credits$/)
        .map((node) => node.textContent?.trim()),
    ).toEqual(["100 credits"]);
  });

  test("collapses repeated top-ups of the same bundle into one row", () => {
    state.creditGrants = autoTopups(3, () => ({
      billingCreditBundleId: "shared-bundle",
    }));

    render(<PlanManager />);

    const section = sectionFor("Top-ups");
    expect(within(section).getAllByText(/^\d+ credits$/)).toHaveLength(1);
    expect(within(section).getByText("(3)")).toBeInTheDocument();
  });
});
