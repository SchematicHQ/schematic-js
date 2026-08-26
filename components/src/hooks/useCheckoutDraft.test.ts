import { act, renderHook } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, test } from "vitest";

import {
  CheckoutexternalApi,
  Configuration,
  type ChangeSubscriptionRequestBody,
  type CheckoutPriceSnapshot,
} from "../api/checkoutexternal";
import { server } from "../test/mocks/node";
import { resetRecordedGaps } from "../utils/api/catalogAdapter";

import { snapshotToFinance, useCheckoutDraft } from "./useCheckoutDraft";

const BASE = "https://api.schematichq.com";

const api = new CheckoutexternalApi(
  new Configuration({ apiKey: "token_test" }),
);

const selections: ChangeSubscriptionRequestBody = {
  addOnIds: [],
  autoTopupOverrides: [],
  creditBundles: [],
  customFieldValues: [],
  newPlanId: "plan_base",
  newPriceId: "bilpp_m",
  payInAdvance: [],
  skipTrial: false,
};

const snapshotJson = {
  amount_off: 0,
  due_now: 1000,
  is_scheduled_downgrade: false,
  new_charges: 1000,
  opt_in_required: false,
  payment_method_required: true,
  percent_off: 0,
  period_start: "2026-08-26T00:00:00Z",
  priced_at: "2026-08-26T00:00:00Z",
  promo_code_applied: false,
  proration: 0,
  tax_amount: null,
  total_per_billing_period: 1000,
  trial_end: null,
};

// The draft response embeds the selections in wire format.
const selectionsJson = {
  add_on_ids: [],
  auto_topup_overrides: [],
  credit_bundles: [],
  custom_field_values: [],
  new_plan_id: "plan_base",
  new_price_id: "bilpp_m",
  pay_in_advance: [],
  skip_trial: false,
};

function draftJson(version: number, status = "priced") {
  return {
    company_id: "comp_1",
    created_at: "2026-08-26T00:00:00Z",
    id: "chk_1",
    last_activity_at: "2026-08-26T00:00:00Z",
    price_snapshot: snapshotJson,
    priced_at: "2026-08-26T00:00:00Z",
    selections: selectionsJson,
    status,
    updated_at: "2026-08-26T00:00:00Z",
    version,
  };
}

describe("useCheckoutDraft", () => {
  beforeEach(() => {
    resetRecordedGaps();
  });

  test("POSTs on first price, PUTs with version after, and finalizes with the rotated session header", async () => {
    const puts: number[] = [];
    let finalizeSession: string | null = null;

    server.use(
      http.post(`${BASE}/checkouts`, () =>
        HttpResponse.json(
          { data: draftJson(1, "open"), params: {} },
          { headers: { "X-Checkout-Session-ID": "sess_1" } },
        ),
      ),
      http.put(`${BASE}/checkouts/chk_1`, async ({ request }) => {
        const body = (await request.json()) as { version: number };
        puts.push(body.version);
        return HttpResponse.json(
          { data: draftJson(body.version + 1), params: {} },
          { headers: { "X-Checkout-Session-ID": `sess_${body.version + 1}` } },
        );
      }),
      http.post(`${BASE}/checkouts/chk_1/finalize`, ({ request }) => {
        finalizeSession = request.headers.get("X-Checkout-Session-ID");
        return HttpResponse.json({
          data: { confirmPaymentIntentClientSecret: null },
          params: {},
        });
      }),
    );

    const { result } = renderHook(() => useCheckoutDraft(api));

    await act(() => result.current.price(selections));
    expect(result.current.draft.draftId).toBe("chk_1");
    expect(result.current.draft.version).toBe(1);
    expect(result.current.draft.snapshot?.dueNow).toBe(1000);

    await act(() => result.current.price(selections));
    expect(puts).toEqual([1]);
    expect(result.current.draft.version).toBe(2);

    await act(() => result.current.finalize());
    expect(finalizeSession).toBe("sess_2");
  });

  test("refreshes the version and replays once on a 409 conflict", async () => {
    let conflicted = false;
    const puts: number[] = [];

    server.use(
      http.post(`${BASE}/checkouts`, () =>
        HttpResponse.json({ data: draftJson(1, "open"), params: {} }),
      ),
      http.get(`${BASE}/checkouts/chk_1`, () =>
        HttpResponse.json({ data: draftJson(7), params: {} }),
      ),
      http.put(`${BASE}/checkouts/chk_1`, async ({ request }) => {
        const body = (await request.json()) as { version: number };
        puts.push(body.version);
        if (!conflicted) {
          conflicted = true;
          return HttpResponse.json(
            { error: "version conflict" },
            {
              status: 409,
            },
          );
        }
        return HttpResponse.json({
          data: draftJson(body.version + 1),
          params: {},
        });
      }),
    );

    const { result } = renderHook(() => useCheckoutDraft(api));

    await act(() => result.current.price(selections));
    await act(() => result.current.price(selections));

    // First PUT at stale version 1 conflicts; replay carries the refreshed
    // version 7.
    expect(puts).toEqual([1, 7]);
    expect(result.current.draft.version).toBe(8);
  });

  test("drops a stale response when a newer price supersedes it", async () => {
    let releaseSlow: (() => void) | undefined;
    const slowGate = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });
    let putCount = 0;

    server.use(
      http.post(`${BASE}/checkouts`, () =>
        HttpResponse.json({ data: draftJson(1, "open"), params: {} }),
      ),
      http.put(`${BASE}/checkouts/chk_1`, async ({ request }) => {
        const body = (await request.json()) as {
          version: number;
          newPriceId: string;
        };
        putCount++;
        if (body.newPriceId === "bilpp_slow") {
          await slowGate;
          return HttpResponse.json({ data: draftJson(50), params: {} });
        }
        return HttpResponse.json({
          data: draftJson(body.version + 1),
          params: {},
        });
      }),
    );

    const { result } = renderHook(() => useCheckoutDraft(api));
    await act(() => result.current.price(selections));

    let slowResult: unknown = "unset";
    await act(async () => {
      const slow = result.current
        .price({ ...selections, newPriceId: "bilpp_slow" })
        .then((r) => {
          slowResult = r;
        });
      const fast = result.current.price(selections);
      await fast;
      releaseSlow?.();
      await slow;
    });

    expect(putCount).toBe(2);
    // The superseded call resolved undefined and did not clobber the state
    // written by the newer call.
    expect(slowResult).toBeUndefined();
    expect(result.current.draft.version).toBe(2);
  });

  test("does not double-create on two rapid first prices", async () => {
    let creates = 0;

    server.use(
      http.post(`${BASE}/checkouts`, () => {
        creates++;
        return HttpResponse.json({ data: draftJson(1, "open"), params: {} });
      }),
      http.put(`${BASE}/checkouts/chk_1`, () =>
        HttpResponse.json({ data: draftJson(2), params: {} }),
      ),
    );

    const { result } = renderHook(() => useCheckoutDraft(api));

    await act(async () => {
      await Promise.all([
        result.current.price(selections),
        result.current.price(selections),
      ]);
    });

    expect(creates).toBe(1);
  });
});

describe("snapshotToFinance", () => {
  test("maps priced fields and fabricates what the snapshot lacks", () => {
    resetRecordedGaps();

    const snapshot: CheckoutPriceSnapshot = {
      amountOff: 500,
      dueNow: 1500,
      isScheduledDowngrade: false,
      newCharges: 2000,
      optInRequired: false,
      paymentMethodRequired: true,
      percentOff: 25,
      periodStart: new Date("2026-09-01T00:00:00Z"),
      pricedAt: new Date("2026-08-26T00:00:00Z"),
      promoCodeApplied: true,
      proration: -100,
      taxAmount: 190,
      totalPerBillingPeriod: 2000,
      trialEnd: null,
    };

    const finance = snapshotToFinance(snapshot);

    expect(finance.dueNow).toBe(1500);
    expect(finance.amountOff).toBe(500);
    expect(finance.percentOff).toBe(25);
    expect(finance.taxAmount).toBe(190);
    expect(finance.promoCodeApplied).toBe(true);
    // Degradations (gaps #4/#5): no discount detail, period_end falls back to
    // period_start, no tax name, no line items.
    expect(finance.discountAmount).toBe(0);
    expect(finance.discounts).toEqual([]);
    expect(finance.periodEnd).toEqual(finance.periodStart);
    expect(finance.taxDisplayName).toBeNull();
    expect(finance.upcomingInvoiceLineItems).toEqual([]);
  });
});
