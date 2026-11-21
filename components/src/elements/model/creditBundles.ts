import type {
  Catalog,
  CatalogCreditBundle,
  Company,
} from "@schematichq/schematic-react";

import { checkoutCurrencies } from "./checkoutCart";
import { bundlePrice, compatibleWith } from "./checkoutPrices";
import { featureName, formatCredits, formatCurrency } from "./format";

/**
 * `deriveCreditBundles`: the bundles the company can buy as the list shows
 * them, with credits and prices formatted here. Expiry wording is the
 * element's, keyed by `expiry.kind`.
 */

/** When a bundle's credits lapse. */
export type CreditBundleExpiry =
  | { kind: "never" }
  | { kind: "afterDays"; count: number }
  | { kind: "afterPeriods"; count: number }
  | { kind: "periodEnd" }
  | { kind: "nextPeriodEnd" }
  | { kind: "trialEnd" };

export interface CreditBundleRow {
  id: string;
  name: string;
  creditId: string;
  /** Credits one purchase grants; `null` for a bundle sold by the credit. */
  credits: number | null;
  /** `credits`, formatted; `null` beside `credits`. */
  creditsText: string | null;
  /** The credit's name, inflected for `credits` (singular when sold by the credit). */
  unitName: string;
  /** `null` when the bundle's expiry is not configured well enough to say. */
  expiry: CreditBundleExpiry | null;
  /** Per purchase, or per credit when `credits` is `null`. */
  priceText: string | null;
  bundle: CatalogCreditBundle;
}

export interface CreditBundlesView {
  rows: CreditBundleRow[];
  /** The currency the bundles are priced in. */
  currency: string;
}

export interface DeriveCreditBundlesOptions {
  /** Credit ids to keep; every credit when absent. */
  credits?: readonly string[];
  locale: string;
}

/**
 * The plan bundles are bought beside: the catalog's current plan, unless the
 * company could start a trial on it, else the company's own. Checkout stages
 * the same plan when it opens with no plan chosen.
 */
export function bundlePlanId(
  catalog: Catalog,
  company: Company | undefined,
): string | undefined {
  return (
    catalog.plans.find(
      (p) => p.current && !(p.isTrialable && p.companyCanTrial),
    )?.id ?? company?.plan?.id
  );
}

/**
 * The bundles on offer, in catalog order: the ones the plan may buy, priced
 * in the currency Checkout would charge, in the credits asked for.
 */
export function deriveCreditBundles(
  catalog: Catalog,
  company: Company | undefined,
  { credits, locale }: DeriveCreditBundlesOptions,
): CreditBundlesView {
  const { locked, options } = checkoutCurrencies(catalog, company, undefined);
  const currency = locked ?? options[0] ?? catalog.defaultCurrency;
  const planId = bundlePlanId(catalog, company);

  const rows = catalog.creditBundles
    .filter(
      (bundle) =>
        (credits === undefined || credits.includes(bundle.creditId)) &&
        compatibleWith(bundle.compatiblePlanIds, planId) &&
        bundlePrice(bundle, currency) !== undefined,
    )
    .map((bundle) => bundleRow(bundle, currency, locale));

  return { rows, currency };
}

function bundleRow(
  bundle: CatalogCreditBundle,
  currency: string,
  locale: string,
): CreditBundleRow {
  const credits = bundle.quantity ?? null;
  const price = bundlePrice(bundle, currency);
  return {
    id: bundle.id,
    name: bundle.name,
    creditId: bundle.creditId,
    credits,
    creditsText: credits === null ? null : formatCredits(credits, locale),
    unitName: creditName(bundle, credits ?? 1, locale),
    expiry: bundleExpiry(bundle),
    priceText:
      price === undefined
        ? null
        : formatCurrency(
            typeof price.priceDecimal === "string"
              ? Number(price.priceDecimal)
              : price.price,
            price.currency,
            locale,
          ),
    bundle,
  };
}

function creditName(
  bundle: CatalogCreditBundle,
  count: number,
  locale: string,
): string {
  return featureName(
    {
      name: bundle.creditName,
      pluralName: bundle.creditPluralName,
      singularName: bundle.creditSingularName,
    },
    count,
    locale,
  );
}

function bundleExpiry(bundle: CatalogCreditBundle): CreditBundleExpiry | null {
  switch (bundle.expiryType) {
    case "duration": {
      const count = bundle.expiryUnitCount ?? null;
      if (count === null || count <= 0) {
        return null;
      }
      return bundle.expiryUnit === "billing_periods"
        ? { kind: "afterPeriods", count }
        : { kind: "afterDays", count };
    }
    case "end_of_billing_period":
      return { kind: "periodEnd" };
    case "end_of_next_billing_period":
      return { kind: "nextPeriodEnd" };
    case "end_of_trial":
      return { kind: "trialEnd" };
    case "no_expiry":
      return { kind: "never" };
    default:
      return null;
  }
}
