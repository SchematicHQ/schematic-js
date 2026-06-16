// UpcomingBill composable namespace.
//
//   <UpcomingBill.Root>
//     <UpcomingBill.Loading>…</UpcomingBill.Loading>
//     <UpcomingBill.ErrorState>{({ retry }) => …}</UpcomingBill.ErrorState>
//     <UpcomingBill.Content>
//       {({ upcomingInvoice, balances, discounts }) => …}
//     </UpcomingBill.Content>
//   </UpcomingBill.Root>

import * as React from "react";

import {
  type CurrencyBalance,
  type InvoiceResponseData,
} from "../../api/checkoutexternal";
import { type RenderProp } from "../internal";

import {
  UpcomingBillProvider,
  useUpcomingBill,
  useUpcomingBillController,
  type UpcomingBillDiscount,
} from "./context";

export interface UpcomingBillRootProps {
  children?: React.ReactNode;
}

/** Pure provider — runs the controller and publishes context. */
function Root({ children }: UpcomingBillRootProps) {
  const value = useUpcomingBillController();
  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      value.isVisible,
      value.isLoading,
      value.error,
      value.upcomingInvoice,
      value.balances,
      value.discounts,
      value.retry,
    ],
  );
  return <UpcomingBillProvider value={memoized}>{children}</UpcomingBillProvider>;
}
Root.displayName = "UpcomingBill.Root";

/** Renders children only while the upcoming invoice is loading. */
function Loading({ children }: { children?: React.ReactNode }) {
  const { isLoading } = useUpcomingBill();
  return isLoading ? <>{children}</> : null;
}
Loading.displayName = "UpcomingBill.Loading";

/** Renders only when an error occurred; exposes `retry` via render prop. */
function ErrorState({
  children,
}: {
  children: RenderProp<{ error: Error; retry: () => void }>;
}) {
  const { error, retry } = useUpcomingBill();
  return error ? <>{children({ error, retry })}</> : null;
}
ErrorState.displayName = "UpcomingBill.ErrorState";

export interface UpcomingBillContentRenderProps {
  upcomingInvoice?: InvoiceResponseData;
  balances: CurrencyBalance[];
  discounts: UpcomingBillDiscount[];
}

/** Renders the invoice details once loaded without error. */
function Content({
  children,
}: {
  children: RenderProp<UpcomingBillContentRenderProps>;
}) {
  const { isLoading, error, upcomingInvoice, balances, discounts } =
    useUpcomingBill();
  if (isLoading || error) {
    return null;
  }
  return <>{children({ upcomingInvoice, balances, discounts })}</>;
}
Content.displayName = "UpcomingBill.Content";

export const UpcomingBill = Object.assign(Root, {
  Root,
  Loading,
  ErrorState,
  Content,
});

export {
  UpcomingBillContext,
  useUpcomingBill,
  type UpcomingBillContextValue,
  type UpcomingBillDiscount,
} from "./context";
