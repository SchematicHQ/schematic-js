import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { render } from "../../../test/setup";

import { UpcomingBill } from "./UpcomingBill";

// A referentially-stable embed object: UpcomingBill's effects depend on
// `data`/callback identity, so returning a fresh object per render would loop.
// Tests mutate `subscription.discounts` in place before rendering.
const state = vi.hoisted(() => {
  const subscription = { discounts: [] as Record<string, unknown>[] };
  const embed = {
    data: {
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

  return { embed, subscription };
});

vi.mock("../../../hooks", () => ({
  useEmbed: () => state.embed,
  useIsLightBackground: () => true,
}));

beforeEach(() => {
  state.subscription.discounts = [];
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
