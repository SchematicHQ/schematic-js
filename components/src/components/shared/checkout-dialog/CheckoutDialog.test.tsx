import { act, fireEvent, screen, waitFor } from "@testing-library/react";

import {
  CheckoutBundlePurchaseBehavior,
  ComponentHydrateResponseDataFromJSON,
  type PreviewCheckoutResponse,
} from "../../../api/checkoutexternal";
import { FETCH_DEBOUNCE_TIMEOUT } from "../../../const";
import { EmbedContext, initialContext } from "../../../context";
import hydrateResponse from "../../../test/mocks/handlers/response/hydrate.json";
import { render } from "../../../test/setup";
import type { HydrateDataWithCompanyContext } from "../../../types";

import { CheckoutDialog } from "./CheckoutDialog";

type Json = Record<string, unknown>;

const FREE_PLAN_ID = "plan_free";

/**
 * A company with no billing subscription on a free (price-less) plan: the
 * credit-only purchase flow, where the bundles are the entire order.
 */
function buildCreditOnlyData(
  behavior: CheckoutBundlePurchaseBehavior,
): HydrateDataWithCompanyContext {
  const raw = structuredClone(hydrateResponse.data) as unknown as Json;

  const freePlan: Json = {
    ...(raw.active_plans as Json[])[0],
    id: FREE_PLAN_ID,
    name: "Free",
    current: true,
    is_free: true,
    monthly_price: null,
    yearly_price: null,
    currency_prices: [],
    included_credit_grants: [],
  };
  raw.active_plans = [freePlan];

  const company = raw.company as Json;
  company.billing_subscription = null;
  company.plan = {
    ...(company.plan as Json),
    id: FREE_PLAN_ID,
    name: "Free",
    plan_price: 0,
  };
  raw.subscription = null;

  raw.checkout_settings = {
    ...(raw.checkout_settings as Json),
    bundle_purchase_behavior: behavior,
  };

  return ComponentHydrateResponseDataFromJSON(raw);
}

/** $10.00 due now, matching the single bundle in the hydrate fixture. */
function buildPreviewResponse(): PreviewCheckoutResponse {
  const now = new Date("2026-01-01T00:00:00Z");

  return {
    data: {
      amountOff: 0,
      dueNow: 1000,
      finance: {
        amountOff: 0,
        discountAmount: 0,
        discounts: [],
        dueNow: 1000,
        newCharges: 1000,
        percentOff: 0,
        periodEnd: now,
        periodStart: now,
        promoCodeApplied: false,
        proration: 0,
        taxRequireBillingDetails: false,
        totalPerBillingPeriod: 0,
        upcomingInvoiceLineItems: [],
      },
      isScheduledDowngrade: false,
      newCharges: 1000,
      optInRequired: false,
      paymentMethodRequired: true,
      percentOff: 0,
      periodStart: now,
      promoCodeApplied: false,
      proration: 0,
      usageViolations: [],
    },
    params: {},
  };
}

function renderCheckoutDialog({
  behavior = CheckoutBundlePurchaseBehavior.Individual,
  previewCheckout,
}: {
  behavior?: CheckoutBundlePurchaseBehavior;
  previewCheckout: () => Promise<PreviewCheckoutResponse | undefined>;
}) {
  return render(
    <EmbedContext.Provider
      value={{
        ...initialContext,
        data: buildCreditOnlyData(behavior),
        layout: "checkout",
        checkoutState: { credits: true },
        previewCheckout,
        setLayout: () => {},
        setCheckoutState: () => {},
        clearCheckoutState: () => {},
        debug: () => {},
      }}
    >
      <CheckoutDialog />
    </EmbedContext.Provider>,
  );
}

const dueToday = () => screen.queryByText("Due today:");

/** Fires the debounced preview and lets its state updates settle. */
async function flushDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FETCH_DEBOUNCE_TIMEOUT);
  });
}

describe("`CheckoutDialog` credit-only purchases", () => {
  // jsdom implements neither of these, and the dialog reaches for both on mount.
  beforeAll(() => {
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

    HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.showModal = function showModal(
      this: HTMLDialogElement,
    ) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(
      this: HTMLDialogElement,
    ) {
      this.open = false;
    };
    Element.prototype.scrollTo = function scrollTo() {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("clears the running total when the last chosen bundle is deselected", async () => {
    const previewCheckout = vi.fn(async () => buildPreviewResponse());
    renderCheckoutDialog({ previewCheckout });

    fireEvent.click(await screen.findByText("Choose bundle"));

    await waitFor(() => {
      expect(dueToday()).toBeInTheDocument();
    });

    fireEvent.click(await screen.findByText("Bundle selected"));

    // Nothing is being bought anymore, so the preview from the previous
    // selection must not linger in the sidebar.
    await waitFor(() => {
      expect(dueToday()).not.toBeInTheDocument();
    });
    // The empty order needs no plan and no price, so it is never previewed.
    expect(previewCheckout).toHaveBeenCalledTimes(1);
  });

  it("clears the running total when the bundle quantity is set back to zero", async () => {
    const previewCheckout = vi.fn(async () => buildPreviewResponse());
    renderCheckoutDialog({
      behavior: CheckoutBundlePurchaseBehavior.Quantity,
      previewCheckout,
    });

    const input = await screen.findByRole("spinbutton");
    fireEvent.change(input, { target: { value: "1" } });

    await waitFor(() => {
      expect(dueToday()).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: "0" } });

    await waitFor(() => {
      expect(dueToday()).not.toBeInTheDocument();
    });
  });

  it("ignores a preview that lands after the quantity was zeroed out", async () => {
    // The preview is debounced, so drive the clock explicitly: every step below
    // depends on knowing exactly which requests have been issued.
    vi.useFakeTimers();

    let resolvePreview:
      ((response: PreviewCheckoutResponse) => void) | undefined;
    const previewCheckout = vi.fn(
      () =>
        new Promise<PreviewCheckoutResponse>((resolve) => {
          resolvePreview = resolve;
        }),
    );

    renderCheckoutDialog({
      behavior: CheckoutBundlePurchaseBehavior.Quantity,
      previewCheckout,
    });

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "1" } });
    await flushDebounce();

    expect(previewCheckout).toHaveBeenCalledTimes(1);

    // Zero out while that preview is still in flight; the quantity input stays
    // enabled during a preview, so this is reachable.
    fireEvent.change(input, { target: { value: "0" } });
    await flushDebounce();

    // The empty order is not previewed, so the in-flight request is the only
    // one left that can resolve.
    expect(previewCheckout).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePreview?.(buildPreviewResponse());
    });

    // The superseded response must not repopulate the cleared sidebar.
    expect(dueToday()).not.toBeInTheDocument();
  });
});
