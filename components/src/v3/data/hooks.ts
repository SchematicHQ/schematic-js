import type {
  AnyCatalog,
  CompanyContext,
  CreditBalance,
  FeatureUsageRow,
  InvoicePage,
  UpcomingInvoice,
} from "../contract";

import { useCatalogDataSource, type ResourceHandle } from "./context";

/**
 * The element-facing hooks. Their signatures are the seam Phase 2 re-homes
 * into schematic-react unchanged: one hook per resource, each returning
 * `{ data, error, isPending, refetch }`.
 */

/** The catalog — public, or decorated for the company when a token is held. */
export function useCatalog(): ResourceHandle<AnyCatalog> {
  return useCatalogDataSource().resource("catalog");
}

export function useCompany(): ResourceHandle<CompanyContext> {
  return useCatalogDataSource().resource("company");
}

export function useFeatureUsage(): ResourceHandle<FeatureUsageRow[]> {
  return useCatalogDataSource().resource("usage");
}

export function useCreditBalances(): ResourceHandle<CreditBalance[]> {
  return useCatalogDataSource().resource("credits");
}

export interface InvoicesHandle extends ResourceHandle<InvoicePage> {
  /** Requests the next page; appended to `data.invoices` when it arrives. */
  loadMore: () => void;
}

export function useInvoices(): InvoicesHandle {
  const source = useCatalogDataSource();
  return {
    ...source.resource("invoices"),
    loadMore: source.loadMoreInvoices,
  };
}

export function useUpcomingInvoice(): ResourceHandle<UpcomingInvoice | null> {
  return useCatalogDataSource().resource("upcomingInvoice");
}
