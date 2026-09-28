import { renderHook } from "@testing-library/react";
import { vi } from "vitest";

import { useNextBillDate } from "./useNextBillDate";

const mockUseEmbed = vi.fn();

vi.mock("./useEmbed", () => ({
  useEmbed: (...args: unknown[]) => mockUseEmbed(...args),
}));

const SEP_9_2027 = new Date(2027, 8, 9);
const OCT_24_2027 = new Date(2027, 9, 24);

function setupEmbed(billingSubscription: Record<string, unknown>) {
  mockUseEmbed.mockReturnValue({
    data: {
      company: { billingSubscription },
      upcomingInvoice: {
        collectionMethod: "send_invoice",
        dueDate: OCT_24_2027,
      },
    },
  });
}

describe("useNextBillDate", () => {
  test("reads the bill date from the period end", () => {
    setupEmbed({ periodEnd: SEP_9_2027.getTime() / 1000 });

    const { result } = renderHook(() => useNextBillDate());

    expect(result.current).toEqual({
      billDate: SEP_9_2027,
      paymentDueDate: OCT_24_2027,
    });
  });

  test("falls back to the due date when the period end is 0", () => {
    setupEmbed({ periodEnd: 0 });

    const { result } = renderHook(() => useNextBillDate());

    expect(result.current).toEqual({
      billDate: OCT_24_2027,
      paymentDueDate: undefined,
    });
  });

  test("has no next bill when the subscription cancels at period end", () => {
    setupEmbed({
      periodEnd: SEP_9_2027.getTime() / 1000,
      cancelAtPeriodEnd: true,
    });

    const { result } = renderHook(() => useNextBillDate());

    expect(result.current).toEqual({
      billDate: undefined,
      paymentDueDate: undefined,
    });
  });
});
