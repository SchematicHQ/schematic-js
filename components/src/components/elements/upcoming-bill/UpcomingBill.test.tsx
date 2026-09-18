import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { render } from "../../../test/setup";

import { UpcomingBill } from "./UpcomingBill";

// A referentially-stable embed object: UpcomingBill's effects depend on
// `data`/callback identity, so returning a fresh object per render would loop.
// Tests mutate `subscription.discounts` in place before rendering.
const state = vi.hoisted(() => {
  const subscription = { discounts: [] as Record<string, unknown>[] };
  const company = {
    billingSubscription: undefined as Record<string, unknown> | undefined,
  };
  const embed = {
    data: {
      company,
      component: { id: "comp_1" },
      subscription,
      upcomingInvoice: {
        amountDue: 20000,
        currency: "usd",
        dueDate: new Date("2026-02-03"),
      },
    },
    settings: {
      theme: {
        primary: "#000000",
        typography: { text: { fontSize: 16 } },
      },
    },
    debug: vi.fn(),
    getUpcomingInvoice: vi.fn(),
    getCustomerBalance: vi.fn(),
  };

  return { embed, subscription, company };
});

// Mock the module itself, not the `hooks` barrel, so hooks that call
// `useEmbed` internally (e.g. `useNextBillDate`) see the same state.
vi.mock("../../../hooks/useEmbed", () => ({
  useEmbed: () => state.embed,
}));

vi.mock("../../../hooks/useIsLightBackground", () => ({
  useIsLightBackground: () => true,
}));

beforeEach(() => {
  state.subscription.discounts = [];
  state.company.billingSubscription = undefined;
  state.embed.getUpcomingInvoice.mockResolvedValue({
    data: {
      amountDue: 20000,
      currency: "usd",
      dueDate: new Date("2026-02-03"),
    },
  });
  state.embed.getCustomerBalance.mockResolvedValue({
    data: { balances: [] },
  });
});

// Built from local-time components so the rendered date does not shift with
// the runner's timezone.
const SEP_9_2027 = new Date(2027, 8, 9).getTime() / 1000;
const OCT_24_2027 = new Date(2027, 9, 24);

describe("`UpcomingBill` heading date", () => {
  test("leads with the bill date and calls out the net-terms deadline", async () => {
    // Net 45 on a `send_invoice` subscription: billed Sep 9, payable Oct 24.
    state.company.billingSubscription = {
      periodEnd: SEP_9_2027,
    };
    state.embed.getUpcomingInvoice.mockResolvedValue({
      data: {
        amountDue: 3600000,
        currency: "usd",
        collectionMethod: "send_invoice",
        dueDate: OCT_24_2027,
      },
    });

    render(<UpcomingBill />);

    expect(
      await screen.findByText("Next bill due September 9, 2027"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Payment due October 24, 2027"),
    ).toBeInTheDocument();
  });

  test("omits the deadline line when collection is automatic", async () => {
    state.company.billingSubscription = {
      periodEnd: SEP_9_2027,
    };
    state.embed.getUpcomingInvoice.mockResolvedValue({
      data: {
        amountDue: 3600000,
        currency: "usd",
        collectionMethod: "charge_automatically",
        dueDate: OCT_24_2027,
      },
    });

    render(<UpcomingBill />);

    expect(
      await screen.findByText("Next bill due September 9, 2027"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Payment due/)).not.toBeInTheDocument();
  });

  test("falls back to the due date when the subscription has no period end", async () => {
    render(<UpcomingBill />);

    expect(
      await screen.findByText(/^Next bill due February \d, 2026$/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Payment due/)).not.toBeInTheDocument();
  });
});

describe("`UpcomingBill` discount summary", () => {
  test("shows the discount window for a repeating amount-off coupon", async () => {
    state.subscription.discounts = [
      {
        couponId: "c1",
        amountOff: 10000,
        percentOff: null,
        currency: "usd",
        duration: "repeating",
        durationInMonths: 6,
        isActive: true,
      },
    ];

    render(<UpcomingBill />);

    expect(
      await screen.findByText("$100.00 off for next 6 months"),
    ).toBeInTheDocument();
  });

  test("omits the window for a forever percent-off coupon", async () => {
    state.subscription.discounts = [
      {
        couponId: "c1",
        amountOff: null,
        percentOff: 50,
        currency: "usd",
        duration: "forever",
        durationInMonths: null,
        isActive: true,
      },
    ];

    render(<UpcomingBill />);

    expect(await screen.findByText("50% off")).toBeInTheDocument();
    expect(screen.queryByText(/for next/)).not.toBeInTheDocument();
  });

  test("does not render an inactive (expired) discount", async () => {
    state.subscription.discounts = [
      {
        couponId: "c1",
        amountOff: 10000,
        percentOff: null,
        currency: "usd",
        duration: "repeating",
        durationInMonths: 6,
        isActive: false,
      },
    ];

    render(<UpcomingBill />);

    // Wait for the invoice content to render, then assert the discount is absent.
    expect(await screen.findByText("Estimated bill")).toBeInTheDocument();
    expect(screen.queryByText("Discount")).not.toBeInTheDocument();
    expect(screen.queryByText(/off/)).not.toBeInTheDocument();
  });

  test("does not render a zeroed discount (the '0% off' case)", async () => {
    state.subscription.discounts = [
      {
        couponId: "c1",
        amountOff: 0,
        percentOff: 0,
        currency: "usd",
        duration: "forever",
        durationInMonths: null,
        isActive: true,
      },
    ];

    render(<UpcomingBill />);

    expect(await screen.findByText("Estimated bill")).toBeInTheDocument();
    expect(screen.queryByText("Discount")).not.toBeInTheDocument();
    expect(screen.queryByText("0% off")).not.toBeInTheDocument();
  });
});
