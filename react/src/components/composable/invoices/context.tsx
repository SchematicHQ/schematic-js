// Headless controller + context for the Invoices primitive.
//
// The fetch-on-mount and preview-data-sync effects are ported verbatim from
// the original `Invoices` component; the React Compiler `set-state-in-effect`
// rule flags those intentional patterns, so it is disabled here rather than
// restructured (which would risk behavior changes).
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from "react";

import { type InvoiceResponseData } from "../../api/checkoutexternal";
import { MAX_VISIBLE_INVOICE_COUNT } from "../../const";
import { useEmbed } from "../../hooks";
import { ERROR_UNKNOWN, isError } from "../../utils";
import { createPrimitiveContext } from "../internal";

import { formatInvoices, type FormattedInvoice } from "./formatInvoices";

export interface InvoicesOptions {
  /** Collapsed-list size; the expand toggle flips between this and the max. */
  limit?: number;
  /** Externally-supplied invoice data (overrides hydrated data). */
  data?: InvoiceResponseData[];
}

export interface InvoicesContextValue {
  invoices: FormattedInvoice[];
  /** The collapsed/expanded slice of `invoices`. */
  visibleInvoices: FormattedInvoice[];
  isLoading: boolean;
  error?: Error;
  retry: () => void;
  hasMore: boolean;
  expanded: boolean;
  toggle: () => void;
  isEmpty: boolean;
}

const [InvoicesProvider, useInvoicesContext, InvoicesContext] =
  createPrimitiveContext<InvoicesContextValue>("Invoices");

export { InvoicesContext, InvoicesProvider };

/** Consumer-facing hook. Throws outside `Invoices.Root`. */
export function useInvoices(): InvoicesContextValue {
  return useInvoicesContext("useInvoices");
}

export function useInvoicesController(
  options: InvoicesOptions,
): InvoicesContextValue {
  const { limit = 2, data: dataProp } = options;

  const { data, listInvoices } = useEmbed();

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [invoices, setInvoices] = React.useState<FormattedInvoice[]>(() =>
    formatInvoices(
      data && "invoices" in data
        ? (data.invoices as InvoiceResponseData[])
        : dataProp,
    ),
  );
  const [listSize, setListSize] = React.useState(limit);

  const getInvoices = React.useCallback(async () => {
    try {
      setError(undefined);
      setIsLoading(true);

      const response = await listInvoices();

      if (response) {
        setInvoices(formatInvoices(response.data));
      }
    } catch (err) {
      setError(isError(err) ? err : ERROR_UNKNOWN);
    } finally {
      setIsLoading(false);
    }
  }, [listInvoices]);

  const toggle = () => {
    setListSize((prev) => (prev !== limit ? limit : MAX_VISIBLE_INVOICE_COUNT));
  };

  React.useEffect(() => {
    getInvoices();
  }, [getInvoices]);

  React.useEffect(() => {
    if (dataProp) {
      setInvoices(formatInvoices(dataProp));
    }
  }, [dataProp]);

  // Keep in sync with preview/shared data updates.
  React.useEffect(() => {
    if (data && "invoices" in data) {
      setInvoices(formatInvoices(data.invoices as InvoiceResponseData[]));
    }
  }, [data]);

  return {
    invoices,
    visibleInvoices: invoices.slice(0, listSize),
    isLoading,
    error,
    retry: getInvoices,
    hasMore: invoices.length > limit,
    expanded: listSize !== limit,
    toggle,
    isEmpty: invoices.length === 0,
  };
}
