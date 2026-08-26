import { useCallback, useRef, useState } from "react";

import {
  ResponseError,
  type ChangeSubscriptionRequestBody,
  type CheckoutDraftResponseData,
  type CheckoutPriceSnapshot,
  type CheckoutResponseData,
  type CheckoutStatus,
  type CheckoutexternalApi,
  type PreviewSubscriptionFinanceResponseData,
} from "../api/checkoutexternal";
import { recordGap } from "../utils/api/catalogAdapter";

/**
 * The checkout-session header minted by the server on every PUT re-price and
 * required back on finalize. It rotates per PUT, so the last response always
 * wins. Absent from the OpenAPI spec (gap #9), hence the hand-rolled name.
 */
const CHECKOUT_SESSION_HEADER = "X-Checkout-Session-ID";

export interface CheckoutDraftState {
  draftId?: string;
  version?: number;
  status?: CheckoutStatus;
  snapshot?: CheckoutPriceSnapshot;
}

/**
 * Client state for a persisted checkout draft on the /checkouts API, where
 * the cart is a resource: the first `price()` POSTs to create it and every
 * later call PUTs the full replacement selections — the PUT *is* the preview.
 * Stage sequencing stays entirely client-side; the server only ever sees
 * cart writes.
 */
export function useCheckoutDraft(api: CheckoutexternalApi | null) {
  const [draft, setDraft] = useState<CheckoutDraftState>({});

  const draftIdRef = useRef<string | undefined>(undefined);
  const versionRef = useRef<number | undefined>(undefined);
  const sessionIdRef = useRef<string | undefined>(undefined);
  // Serializes the initial POST so two rapid first prices cannot double-create.
  const createLatchRef = useRef<Promise<void> | null>(null);
  // Monotonic sequence; responses arriving for a stale sequence are dropped.
  const seqRef = useRef(0);

  const applyResponse = useCallback(
    (data: CheckoutDraftResponseData, headers?: Headers) => {
      draftIdRef.current = data.id;
      versionRef.current = data.version;

      const sessionId = headers?.get(CHECKOUT_SESSION_HEADER);
      if (sessionId) {
        sessionIdRef.current = sessionId;
      } else if (headers && !sessionIdRef.current) {
        // Response headers are only readable cross-origin when the server
        // exposes them; a missing session here means finalize will fail
        // (gap #9).
        recordGap(
          9,
          `${CHECKOUT_SESSION_HEADER} not readable on the PUT response ` +
            "(Access-Control-Expose-Headers?)",
        );
      }

      setDraft({
        draftId: data.id,
        version: data.version,
        status: data.status,
        snapshot: data.priceSnapshot,
      });
    },
    [],
  );

  /**
   * Creates or re-prices the draft with a full replacement of the cart
   * selections. Resolves undefined when a newer call superseded this one.
   */
  const price = useCallback(
    async (
      selections: ChangeSubscriptionRequestBody,
    ): Promise<CheckoutDraftResponseData | undefined> => {
      if (!api) {
        return;
      }

      const seq = ++seqRef.current;

      while (createLatchRef.current) {
        await createLatchRef.current;
      }

      if (seq !== seqRef.current) {
        return;
      }

      if (!draftIdRef.current) {
        const latch = (async () => {
          const response = await api.createCheckoutRaw({
            createCheckoutRequest: {
              ...selections,
              generateShareLink: false,
            },
          });
          const { data } = await response.value();
          applyResponse(data, response.raw.headers);
        })();
        createLatchRef.current = latch.finally(() => {
          createLatchRef.current = null;
        });
        await createLatchRef.current;
        return;
      }

      const putOnce = async () => {
        const response = await api.updateCheckoutRaw({
          checkoutId: draftIdRef.current as string,
          updateCheckoutRequest: {
            ...selections,
            version: versionRef.current as number,
          },
        });
        return response;
      };

      let response;
      try {
        response = await putOnce();
      } catch (err) {
        // Version conflict: another writer re-priced the draft. Refresh the
        // version once and replay; a second conflict propagates.
        if (err instanceof ResponseError && err.response.status === 409) {
          const current = await api.getCheckout({
            checkoutId: draftIdRef.current,
          });
          versionRef.current = current.data.version;
          response = await putOnce();
        } else {
          throw err;
        }
      }

      if (seq !== seqRef.current) {
        return;
      }

      const { data } = await response.value();
      applyResponse(data, response.raw.headers);
      return data;
    },
    [api, applyResponse],
  );

  /**
   * Finalizes the draft into a subscription. The finalize body carries only
   * the version (gap #10: payment method and opt-in must already be on the
   * cart via a prior `price()` call), plus the rotating session header.
   */
  const finalize = useCallback(async (): Promise<CheckoutResponseData> => {
    if (!api || !draftIdRef.current || versionRef.current === undefined) {
      throw new Error("checkout draft has not been priced");
    }

    const response = await api.finalizeCheckout(
      {
        checkoutId: draftIdRef.current,
        finalizeCheckoutRequest: { version: versionRef.current },
      },
      {
        headers: sessionIdRef.current
          ? { [CHECKOUT_SESSION_HEADER]: sessionIdRef.current }
          : {},
      },
    );

    return response.data;
  }, [api]);

  const reset = useCallback(() => {
    seqRef.current++;
    draftIdRef.current = undefined;
    versionRef.current = undefined;
    sessionIdRef.current = undefined;
    setDraft({});
  }, []);

  return { draft, price, finalize, reset };
}

/**
 * Projects the persisted price snapshot onto the legacy preview `finance`
 * shape the sidebar renders. Every fabricated field below is a snapshot gap
 * (#4, #5): the values do not exist on the new surface.
 */
export function snapshotToFinance(
  snapshot: CheckoutPriceSnapshot,
): PreviewSubscriptionFinanceResponseData {
  recordGap(
    5,
    "snapshot lacks discount detail, period_end, tax display, and line " +
      "items; sidebar degrades",
  );

  return {
    amountOff: snapshot.amountOff,
    // Gap #5: regresses the 2.22.x discount fix to derived percent math.
    discountAmount: 0,
    discounts: [],
    dueNow: snapshot.dueNow,
    newCharges: snapshot.newCharges,
    percentOff: snapshot.percentOff,
    // Gap #5: no period_end; the next-billing date degrades to period_start.
    periodEnd: snapshot.periodStart,
    periodStart: snapshot.periodStart,
    promoCodeApplied: snapshot.promoCodeApplied,
    proration: snapshot.proration,
    prorationBilledAt: null,
    taxAmount: snapshot.taxAmount,
    taxDisplayName: null,
    // Gap #5: address-collection heuristic input is missing; default to not
    // requiring billing details.
    taxRequireBillingDetails: false,
    totalPerBillingPeriod: snapshot.totalPerBillingPeriod,
    trialEnd: snapshot.trialEnd,
    upcomingInvoiceLineItems: [],
  };
}
