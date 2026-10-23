/**
 * `GET /catalog/view` and `GET /catalogs/{catalog_id}/view`: the catalog as
 * the session's company sees it. `GET /public/catalog` and
 * `GET /public/catalogs/{catalog_id}`: the same catalog as anyone sees it,
 * read with the publishable key. The wire shapes are generated from the API's
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
  CatalogPlanResponseData,
  CompanyCatalogResponseData,
  PublicCatalogResponseData,
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
  CatalogPlanResponseData,
  CompanyCatalogResponseData,
  PublicCatalogResponseData,
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

/**
 * The catalog with no company to stand against it: no `current`, `valid` or
 * trial standing on its plans, and no checkout settings, since nobody is
 * signed in to check out.
 */
export type PublicCatalog = PublicCatalogResponseData;

export type PublicCatalogPlan = CatalogPlanResponseData;

/**
 * A catalog as whoever is reading it sees it. Tagged rather than merged: a
 * public plan is not one the company has no standing against, and filling
 * `valid` in for it would say something the server did not.
 */
export type CatalogView =
  | { source: "company"; catalog: Catalog }
  | { source: "public"; catalog: PublicCatalog };

/** Each catalog is its own resource; none names the environment's own. */
export interface CatalogQuery {
  catalogId?: string;
}

export const DEFAULT_CATALOG_QUERY: CatalogQuery = {};

/** As for invoices: `{ catalogId: undefined }` is the same resource as `{}`. */
export function normalizeCatalogQuery(query: CatalogQuery): CatalogQuery {
  return query.catalogId === undefined ? {} : { catalogId: query.catalogId };
}
