// Headless controller + context for the UpcomingBill primitive.
//
// Lifts the container's data fetching (upcoming invoice + customer balances),
// loading/error state, discount derivation, and visibility gating.
//
// The fetch-on-mount and preview-data-sync effects (and the discounts memo)
// are ported verbatim from the original `UpcomingBill` component; the React
// Compiler health rules below flag those intentional patterns, so they are
// disabled here rather than restructured (which would risk behavior changes).
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */

import * as React from "react";

import {
  type CurrencyBalance,
  type InvoiceResponseData,
} from "../../api/checkoutexternal";
import { useEmbed } from "../../hooks";
import { ERROR_UNKNOWN, isError } from "../../utils";
import { createPrimitiveContext } from "../internal";

export interface UpcomingBillDiscount {
  couponId: string;
  customerFacingCode?: string;
  currency?: string;
  amountOff?: number;
  percentOff?: number;
  isActive: boolean;
}

export interface UpcomingBillContextValue {
  /** False when there is no subscription, or it is scheduled to cancel. */
  isVisible: boolean;
  isLoading: boolean;
  error?: Error;
  upcomingInvoice?: InvoiceResponseData;
  balances: CurrencyBalance[];
  discounts: UpcomingBillDiscount[];
  /** Re-fetches the upcoming invoice. */
  retry: () => void;
}

const [UpcomingBillProvider, useUpcomingBillContext, UpcomingBillContext] =
  createPrimitiveContext<UpcomingBillContextValue>("UpcomingBill");

export { UpcomingBillContext, UpcomingBillProvider };

/** Consumer-facing hook. Throws outside `UpcomingBill.Root`. */
export function useUpcomingBill(): UpcomingBillContextValue {
  return useUpcomingBillContext("useUpcomingBill");
}

export function useUpcomingBillController(): UpcomingBillContextValue {
  const { data, debug, getUpcomingInvoice, getCustomerBalance } = useEmbed();

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [upcomingInvoice, setUpcomingInvoice] = React.useState<
    InvoiceResponseData | undefined
  >(data?.upcomingInvoice);
  const [balances, setBalances] = React.useState<CurrencyBalance[]>([]);

  const discounts = React.useMemo<UpcomingBillDiscount[]>(
    () =>
      (data?.subscription?.discounts || []).map((discount) => ({
        couponId: discount.couponId,
        customerFacingCode: discount.customerFacingCode || undefined,
        currency: discount.currency || undefined,
        amountOff: discount.amountOff ?? undefined,
        percentOff: discount.percentOff ?? undefined,
        isActive: discount.isActive,
      })),
    [data?.subscription?.discounts],
  );

  const getInvoice = React.useCallback(async () => {
    if (
      data?.component?.id &&
      data?.subscription &&
      !data.subscription.cancelAt
    ) {
      try {
        setError(undefined);
        setIsLoading(true);

        const response = await getUpcomingInvoice(data.component.id);

        if (response) {
          setUpcomingInvoice(response.data);
        }
      } catch (err) {
        setError(isError(err) ? err : ERROR_UNKNOWN);
      } finally {
        setIsLoading(false);
      }
    }
  }, [data?.component?.id, data?.subscription, getUpcomingInvoice]);

  const getBalances = React.useCallback(async () => {
    try {
      const response = await getCustomerBalance();

      if (response) {
        setBalances(response.data.balances);
      }
    } catch (err) {
      debug("Failed to fetch customer balance.", err);
    }
  }, [debug, getCustomerBalance]);

  React.useEffect(() => {
    getInvoice();
  }, [getInvoice]);

  React.useEffect(() => {
    getBalances();
  }, [getBalances]);

  // Keep in sync with preview/shared data updates.
  React.useEffect(() => {
    if (data?.upcomingInvoice) {
      setUpcomingInvoice(data.upcomingInvoice);
    }
  }, [data?.upcomingInvoice]);

  return {
    isVisible: !!data?.subscription && !data.subscription.cancelAt,
    isLoading,
    error,
    upcomingInvoice,
    balances,
    discounts,
    retry: getInvoice,
  };
}
