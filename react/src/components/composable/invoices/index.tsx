// Invoices composable namespace.
//
//   <Invoices.Root limit={2}>
//     <Invoices.Loading>…</Invoices.Loading>
//     <Invoices.ErrorState>{({ retry }) => …}</Invoices.ErrorState>
//     <Invoices.List>{({ visibleInvoices }) => …}</Invoices.List>
//     <Invoices.ToggleMore>{({ expanded, toggle }) => …}</Invoices.ToggleMore>
//   </Invoices.Root>

import * as React from "react";

import { type RenderProp } from "../internal";

import {
  InvoicesProvider,
  useInvoices,
  useInvoicesController,
  type InvoicesOptions,
} from "./context";
import { type FormattedInvoice } from "./formatInvoices";

export interface InvoicesRootProps extends InvoicesOptions {
  children?: React.ReactNode;
}

/** Pure provider — runs the controller and publishes context. */
function Root({ children, ...options }: InvoicesRootProps) {
  const value = useInvoicesController(options);
  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      value.invoices,
      value.visibleInvoices,
      value.isLoading,
      value.error,
      value.retry,
      value.hasMore,
      value.expanded,
    ],
  );
  return <InvoicesProvider value={memoized}>{children}</InvoicesProvider>;
}
Root.displayName = "Invoices.Root";

/** Renders children only while invoices are loading. */
function Loading({ children }: { children?: React.ReactNode }) {
  const { isLoading } = useInvoices();
  return isLoading ? <>{children}</> : null;
}
Loading.displayName = "Invoices.Loading";

/** Renders only when an error occurred; exposes `retry` via render prop. */
function ErrorState({
  children,
}: {
  children: RenderProp<{ error: Error; retry: () => void }>;
}) {
  const { error, retry } = useInvoices();
  return error ? <>{children({ error, retry })}</> : null;
}
ErrorState.displayName = "Invoices.ErrorState";

/** Renders the (collapsed/expanded) invoice list once loaded without error. */
function List({
  children,
}: {
  children: RenderProp<{
    invoices: FormattedInvoice[];
    visibleInvoices: FormattedInvoice[];
    isEmpty: boolean;
  }>;
}) {
  const { isLoading, error, invoices, visibleInvoices, isEmpty } = useInvoices();
  if (isLoading || error) {
    return null;
  }
  return <>{children({ invoices, visibleInvoices, isEmpty })}</>;
}
List.displayName = "Invoices.List";

/** Exposes the expand/collapse toggle; renders only when there's more to show. */
function ToggleMore({
  children,
}: {
  children: RenderProp<{ expanded: boolean; toggle: () => void }>;
}) {
  const { hasMore, expanded, toggle } = useInvoices();
  return hasMore ? <>{children({ expanded, toggle })}</> : null;
}
ToggleMore.displayName = "Invoices.ToggleMore";

export const Invoices = Object.assign(Root, {
  Root,
  Loading,
  ErrorState,
  List,
  ToggleMore,
});

export {
  InvoicesContext,
  useInvoices,
  type InvoicesContextValue,
  type InvoicesOptions,
} from "./context";
export { formatInvoices, type FormattedInvoice } from "./formatInvoices";
