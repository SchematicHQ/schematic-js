import {
  useBillingDataSource,
  useCatalog,
  useCompany,
  type CatalogCreditBundle,
} from "@schematichq/schematic-react";
import { useId, useMemo } from "react";

import { useCheckoutLauncher } from "./checkout/launcher";
import {
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
import {
  deriveCreditBundles,
  httpStatus,
  type CreditBundleExpiry,
  type CreditBundleRow,
  type SkippableStep,
} from "./model";
import type { Translator } from "./strings";

export interface CreditBundlesProps extends ElementProps {
  /** Credit ids whose bundles to show; every credit when absent. */
  credits?: string[];
  /** The catalog to read and buy from. Default: the account's default catalog. */
  catalogId?: string;
  /** The "Credit bundles" heading. Default true. */
  showHeader?: boolean;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
  /**
   * Called with the bundle instead of opening the nearest
   * `CheckoutLauncherProvider`'s checkout with it staged.
   */
  onBuy?: (bundle: CatalogCreditBundle) => void;
}

/** Every step but credits and payment; a bundle bought here changes nothing else. */
const SKIP: readonly SkippableStep[] = [
  "plan",
  "autoTopup",
  "usage",
  "addOns",
  "addOnUsage",
];

const SKELETON_ROWS = 3;

/** Loaded, or failed: the company only narrows what is on offer. */
const settled = (handle: { data: unknown; error: Error | undefined }) =>
  handle.data !== undefined || handle.error !== undefined;

/**
 * The credit bundles the company's plan can buy, each with a button that opens
 * checkout with that one bundle staged on the current plan. Bundles the plan
 * cannot buy, or that have no price in the company's currency, are left out.
 *
 * Renders nothing without a session, and nothing when the account has no
 * catalog to read or cannot sell through checkout.
 */
export function CreditBundles({
  catalogId,
  className,
  credits,
  headingLevel = 2,
  locale: localeProp,
  onBuy,
  showHeader = true,
  strings,
}: CreditBundlesProps) {
  const catalog = useCatalog(
    catalogId === undefined ? undefined : { catalogId },
  );
  const company = useCompany();
  const readingPublic = useBillingDataSource().catalogSource?.() === "public";
  const launcher = useCheckoutLauncher();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);
  const headingId = useId();
  const Heading = `h${headingLevel}` as const;

  const catalogData =
    catalog.data?.source === "company" ? catalog.data.catalog : undefined;
  const ready = catalogData !== undefined && settled(company);
  const view = useMemo(
    () =>
      ready && catalogData !== undefined
        ? deriveCreditBundles(catalogData, company.data, { credits, locale })
        : undefined,
    [catalogData, company.data, credits, locale, ready],
  );

  const status = httpStatus(catalog.error);
  if (
    readingPublic ||
    (catalogData === undefined && (status === 403 || status === 404)) ||
    catalogData?.capabilities.checkout === false
  ) {
    return null;
  }

  const buy = (row: CreditBundleRow) => {
    if (onBuy !== undefined) {
      onBuy(row.bundle);
      return;
    }
    launcher.open({
      catalogId,
      selection: { creditBundles: { [row.id]: 1 } },
      steps: { hideSkipped: true, initial: "credits", skip: SKIP },
    });
  };

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-credit-bundles", className)}
      error={catalog.error}
      errorMessage={t("creditBundlesError")}
      hasData={view !== undefined}
      isPending={view === undefined}
      loadingLabel={t("creditBundlesLoading")}
      onRetry={catalog.refetch}
      retryText={t("retry")}
      skeleton={<CreditBundlesSkeleton showHeader={showHeader} />}
    >
      {view !== undefined && (
        <>
          {showHeader && (
            <div className="schematic-header">
              <Heading className="schematic-header__title" id={headingId}>
                {t("creditBundlesHeader")}
              </Heading>
            </div>
          )}
          {view.rows.length === 0 ? (
            <div className="schematic-credit-bundles__empty">
              <p className="schematic-credit-bundles__empty-title">
                {t("creditBundlesEmpty")}
              </p>
              <p className="schematic-muted schematic-small schematic-credit-bundles__empty-note">
                {t("creditBundlesEmptyNote")}
              </p>
            </div>
          ) : (
            <ul
              className="schematic-credit-bundles__list"
              aria-label={showHeader ? undefined : t("creditBundlesHeader")}
              aria-labelledby={showHeader ? headingId : undefined}
            >
              {view.rows.map((row) => (
                <li
                  className="schematic-credit-bundles__row"
                  data-testid="schematic-credit-bundle"
                  key={row.id}
                >
                  <span className="schematic-credit-bundles__what">
                    <span className="schematic-credit-bundles__name">
                      {row.name}
                    </span>
                    <span className="schematic-muted schematic-small schematic-credit-bundles__detail">
                      {detailText(row, t)}
                    </span>
                  </span>
                  <button
                    aria-label={
                      row.credits !== null && row.priceText !== null
                        ? t("creditBundlesBuyPriceLabel", {
                            name: row.name,
                            price: row.priceText,
                          })
                        : t("creditBundlesBuyLabel", { name: row.name })
                    }
                    className="schematic-cta schematic-cta--small schematic-credit-bundles__buy"
                    type="button"
                    onClick={() => buy(row)}
                  >
                    {row.credits !== null && row.priceText !== null
                      ? row.priceText
                      : t("creditBundlesBuyUnpriced")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </StatusFrame>
  );
}

/** "500 AI credits · Never expire", or "$0.02 per AI credit · …" sold by the credit. */
function detailText(row: CreditBundleRow, t: Translator): string {
  const amount =
    row.creditsText === null
      ? t("creditBundlesPerUnit", {
          credit: row.unitName,
          price: row.priceText ?? "",
        })
      : t("creditBundlesCredits", {
          amount: row.creditsText,
          credits: row.unitName,
        });
  const expiry = expiryText(row.expiry, t);
  return expiry === undefined ? amount : `${amount} · ${expiry}`;
}

function expiryText(
  expiry: CreditBundleExpiry | null,
  t: Translator,
): string | undefined {
  switch (expiry?.kind) {
    case "never":
      return t("creditBundlesNeverExpire");
    case "afterDays":
      return t("creditBundlesExpireAfterDays", { count: expiry.count });
    case "afterPeriods":
      return t("creditBundlesExpireAfterPeriods", { count: expiry.count });
    case "periodEnd":
      return t("creditBundlesExpirePeriodEnd");
    case "nextPeriodEnd":
      return t("creditBundlesExpireNextPeriodEnd");
    case "trialEnd":
      return t("creditBundlesExpireTrialEnd");
    default:
      return undefined;
  }
}

function CreditBundlesSkeleton({ showHeader }: { showHeader: boolean }) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <div className="schematic-skeleton__row" key={row}>
          <div className="schematic-skeleton__cell" data-column="name" />
          <div className="schematic-skeleton__cell" data-column="buy" />
        </div>
      ))}
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
CreditBundles.resources = ["catalog", "company"] as const;

export default CreditBundles;
