import { useCallback, useSyncExternalStore } from "react";

import type {
  AnyCatalog,
  CatalogResourceName,
  CatalogResources,
  CompanyContext,
  CreditBalanceEntry,
  FeatureUsageRow,
  InvoicePage,
  UpcomingInvoice,
} from "./contract";
import { useCatalogDataSource, type ResourceHandle } from "./context";

/**
 * One hook per catalog resource, each returning
 * `{ data, error, isPending, refetch }`. Hooks never fetch during server
 * rendering: without `initialData` they report pending on the server and
 * load on the client.
 */

function useCatalogResource<K extends CatalogResourceName>(
  name: K,
): ResourceHandle<CatalogResources[K]> {
  const source = useCatalogDataSource();
  const subscribe = useCallback(
    (listener: () => void) => source.subscribe(name, listener),
    [name, source],
  );
  const getSnapshot = useCallback(() => source.handle(name), [name, source]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** The catalog — public, or decorated for the company when a token is held. */
export function useCatalog(): ResourceHandle<AnyCatalog> {
  return useCatalogResource("catalog");
}

export function useCompany(): ResourceHandle<CompanyContext> {
  return useCatalogResource("company");
}

export function useFeatureUsage(): ResourceHandle<FeatureUsageRow[]> {
  return useCatalogResource("usage");
}

export function useCreditBalances(): ResourceHandle<CreditBalanceEntry[]> {
  return useCatalogResource("credits");
}

export interface InvoicesHandle extends ResourceHandle<InvoicePage> {
  /** Requests the next page; appended to `data.invoices` when it arrives. */
  loadMore: () => void;
}

export function useInvoices(): InvoicesHandle {
  const source = useCatalogDataSource();
  const handle = useCatalogResource("invoices");
  return { ...handle, loadMore: source.loadMoreInvoices };
}

export function useUpcomingInvoice(): ResourceHandle<UpcomingInvoice | null> {
  return useCatalogResource("upcomingInvoice");
}

/** Reloads every loaded catalog resource (after a plan change, for instance). */
export function useInvalidateCatalog(): () => void {
  return useCatalogDataSource().invalidateAll;
}

/** The locale configured on the provider, if any. */
export function useSchematicLocale(): string | undefined {
  return useCatalogDataSource().locale;
}
