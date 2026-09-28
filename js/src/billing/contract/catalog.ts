/**
 * `GET /catalog/view` and `GET /catalogs/{catalog_id}/view`: the catalog as
 * the session's company sees it. The wire shapes are generated from the API's
 * spec by scripts/generate-billing-api.sh and re-exported here under their
 * domain names.
 */

import type {
  CatalogAutoTopupResponseData,
  CatalogBundleCurrencyPriceResponseData,
  CatalogCheckoutFieldResponseData,
  CatalogCheckoutSettingsResponseData,
  CatalogCompanyPlanResponseData,
  CatalogCreditBundleResponseData,
  CatalogCurrencyPricesResponseData,
  CatalogPlanEntitlementResponseData,
  CompanyCatalogResponseData,
} from "../api/generated/models";

export type {
  CatalogAutoTopupResponseData,
  CatalogBundleCurrencyPriceResponseData,
  CatalogCheckoutFieldResponseData,
  CatalogCheckoutSettingsResponseData,
  CatalogCompanyPlanResponseData,
  CatalogCreditBundleResponseData,
  CatalogCurrencyPricesResponseData,
  CatalogPlanEntitlementResponseData,
  CompanyCatalogResponseData,
};

/**
 * What the company can buy, and how it stands against each of it. What the
 * server has already decided, so a consumer never re-derives it:
 *
 * * On each plan and add-on, `current`, `valid` with its `invalidReason` and
 *   `usageViolations`, and `companyCanTrial`.
 * * `capabilities.checkout` — whether this company can check out at all.
 * * `checkoutSettings` — what checkout collects, custom fields included.
 * * `compatiblePlanIds` on add-ons and bundles — `undefined` means every
 *   plan, and an empty list none.
 */
export type Catalog = CompanyCatalogResponseData;

export type CatalogPlan = CatalogCompanyPlanResponseData;

export type CatalogCreditBundle = CatalogCreditBundleResponseData;

export type CatalogAutoTopup = CatalogAutoTopupResponseData;

export type CatalogCheckoutField = CatalogCheckoutFieldResponseData;

export type CatalogEntitlement = CatalogPlanEntitlementResponseData;

/** Each catalog is its own resource; none names the environment's own. */
export interface CatalogQuery {
  catalogId?: string;
}

export const DEFAULT_CATALOG_QUERY: CatalogQuery = {};

/** As for invoices: `{ catalogId: undefined }` is the same resource as `{}`. */
export function normalizeCatalogQuery(query: CatalogQuery): CatalogQuery {
  return query.catalogId === undefined ? {} : { catalogId: query.catalogId };
}
