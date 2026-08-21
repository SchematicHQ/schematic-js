import {
  deriveCreditBalances,
  derivePlanOfferings,
  useCatalog,
  useCreditBalances,
  useSchematicLocale,
  type CreditBundleOffering,
} from "@schematichq/schematic-react";
import React, { useMemo } from "react";

import { StatusFrame, cx } from "./common";

export interface CreditUsageProps {
  /**
   * Href for the "Buy more" action; rendered as a link with the credit ID
   * and bundle ID appended as query params (`credit_id`, `bundle_id`).
   */
  buyMoreUrl?: string;
  className?: string;
  /** BCP 47 locale for formatting; the provider's locale, then the browser's, if omitted. */
  locale?: string;
  /**
   * Called when "Buy more" is clicked for a credit, with the catalog bundle
   * offered for it — the handoff to your purchase flow. The action renders
   * only when the catalog offers a bundle for the credit and one of
   * onBuyBundle / buyMoreUrl is given.
   */
  onBuyBundle?: (bundle: CreditBundleOffering) => void;
}

const buyMoreHref = (url: string, bundle: CreditBundleOffering): string => {
  const joiner = url.includes("?") ? "&" : "?";
  const params = new URLSearchParams({
    bundle_id: bundle.id,
    credit_id: bundle.creditId,
  });
  return `${url}${joiner}${params.toString()}`;
};

/**
 * Credit burndown per credit type, with the grant ledger behind a
 * disclosure and a "Buy more" action for credits the catalog sells bundles
 * of. Requires an access token.
 */
export const CreditUsage: React.FC<CreditUsageProps> = ({
  buyMoreUrl,
  className,
  locale: localeProp,
  onBuyBundle,
}) => {
  const { data, error, isPending, refetch } = useCreditBalances();
  const wantsBundles = buyMoreUrl !== undefined || onBuyBundle !== undefined;
  // The catalog (shared with the other elements on the page, so usually
  // already cached) supplies the bundles behind "Buy more". The hook is
  // unconditional — it subscribes and fetches either way — but the result
  // is only consulted when a purchase handoff is configured, and its
  // errors never block the balances.
  const catalog = useCatalog();
  const providerLocale = useSchematicLocale();
  const locale = localeProp ?? providerLocale;
  const credits = useMemo(
    () =>
      data !== undefined ? deriveCreditBalances(data.balances, { locale }) : [],
    [data, locale],
  );
  const bundlesByCredit = useMemo(() => {
    const byCredit = new Map<string, CreditBundleOffering>();
    if (!wantsBundles || catalog.data === undefined) {
      return byCredit;
    }
    // The first bundle offered per credit, in catalog order.
    for (const bundle of derivePlanOfferings(catalog.data, { locale })
      .creditBundles) {
      if (!byCredit.has(bundle.creditId)) {
        byCredit.set(bundle.creditId, bundle);
      }
    }
    return byCredit;
  }, [catalog.data, locale, wantsBundles]);

  return (
    <StatusFrame
      className={cx("schematic-credit-usage", className)}
      error={error}
      hasData={data !== undefined}
      isPending={isPending}
      onRetry={() => void refetch()}
    >
      {credits.length === 0 ? (
        <span className="schematic-muted">No credits</span>
      ) : (
        credits.map((credit) => {
          const bundle = bundlesByCredit.get(credit.creditId);
          return (
            <div className="schematic-meter" key={credit.creditId}>
              <div className="schematic-meter__labels">
                <span>{credit.creditName}</span>
                <span>
                  {credit.formattedRemaining} of {credit.formattedTotal} left
                </span>
              </div>
              <div
                aria-label={credit.creditName}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.round(credit.percentUsed)}
                className="schematic-meter__bar"
                role="progressbar"
              >
                <div
                  className="schematic-meter__fill"
                  style={{ width: `${credit.percentUsed}%` }}
                />
              </div>
              <div className="schematic-row">
                <details>
                  <summary className="schematic-muted">
                    {credit.grants.length} grant
                    {credit.grants.length === 1 ? "" : "s"}
                  </summary>
                  {credit.grants.map((grant) => (
                    <div className="schematic-row" key={grant.id}>
                      {/* Source label assembled here from structured parts. */}
                      <span>
                        {grant.source.planName ??
                          grant.source.bundleName ??
                          grant.source.reason}
                      </span>
                      <span className="schematic-muted">
                        {grant.formattedRemaining} / {grant.formattedQuantity}
                        {grant.formattedExpiresAt !== undefined &&
                          `, expires ${grant.formattedExpiresAt}`}
                      </span>
                    </div>
                  ))}
                </details>
                {bundle !== undefined &&
                  (buyMoreUrl !== undefined ? (
                    <a
                      className="schematic-link-button"
                      href={buyMoreHref(buyMoreUrl, bundle)}
                      onClick={() => onBuyBundle?.(bundle)}
                    >
                      Buy more
                    </a>
                  ) : (
                    <button
                      className="schematic-link-button"
                      type="button"
                      onClick={() => onBuyBundle?.(bundle)}
                    >
                      Buy more
                    </button>
                  ))}
              </div>
            </div>
          );
        })
      )}
    </StatusFrame>
  );
};
