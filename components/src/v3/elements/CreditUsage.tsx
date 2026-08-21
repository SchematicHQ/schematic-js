import {
  useCatalog,
  useCompany,
  useCreditBalances,
} from "@schematichq/schematic-react";
import { useMemo, useState } from "react";

import {
  deriveCreditBalances,
  resolveLocale,
  type BundleOffer,
  type CreditBalanceSummary,
  type LedgerRow,
} from "../model";

import {
  Cta,
  Icon,
  Meter,
  StatusFrame,
  cx,
  pickVisible,
  type ElementProps,
} from "./common";

export interface CreditUsageProps extends ElementProps {
  /** Credit IDs to show, in this order. Default: every balance, in server order. */
  visibleCredits?: string[];
  /** The "Credits" heading. Default true. */
  showHeader?: boolean;
  /** Heading copy. Default "Credits". */
  headerText?: string;
  /** Credit icons. Default true. */
  showIcons?: boolean;
  /** Credit descriptions. Default true. */
  showDescription?: boolean;
  /** The collapsible grant ledger. Default true. */
  showLedger?: boolean;
  /** "Expires …" beside the remaining count. Default true. */
  showExpiry?: boolean;
  /** The purchasable bundles under the "Buy more" CTA. Default true. */
  showBundles?: boolean;
  /** Ledger rows shown before "See all". Default 3. */
  visibleGrantCount?: number;
  /** Percent used at which the meter warns. Default 90. */
  warningPercent?: number;
  /** Called when "Buy more" is activated. */
  onBuyBundle?: (summary: CreditBalanceSummary, bundles: BundleOffer[]) => void;
  /** "Buy more" destination; combined with `onBuyBundle` when both are given. */
  buyMoreUrl?: string;
  buyMoreTarget?: string;
}

/**
 * The company's credit balances: one card per credit with a burndown
 * meter, the grant ledger behind it, and a "Buy more" call to action when
 * the catalog sells bundles for it.
 */
export function CreditUsage({
  buyMoreTarget,
  buyMoreUrl,
  className,
  headerText = "Credits",
  locale: localeProp,
  onBuyBundle,
  showBundles = true,
  showDescription = true,
  showExpiry = true,
  showHeader = true,
  showIcons = true,
  showLedger = true,
  visibleCredits,
  visibleGrantCount = 3,
  warningPercent,
}: CreditUsageProps) {
  const { data: balances, error, isPending, refetch } = useCreditBalances();
  // The catalog and company only decorate the balances (bundles, plan
  // compatibility, currency); the element renders without them.
  const { data: catalog } = useCatalog();
  const { data: company } = useCompany();
  const locale = resolveLocale(localeProp);

  const summaries = useMemo(
    () =>
      balances === undefined
        ? undefined
        : pickVisible(
            deriveCreditBalances(balances, {
              locale,
              catalog,
              currentPlanId: company?.plan?.id ?? null,
              currency: company?.subscription?.currency,
              warningPercent,
            }),
            visibleCredits,
            (summary) => summary.credit.id,
          ),
    [balances, catalog, company, locale, visibleCredits, warningPercent],
  );

  return (
    <StatusFrame
      className={cx("schematic-credit-usage", className)}
      error={error}
      hasData={summaries !== undefined}
      isPending={isPending}
      label="credits"
      onRetry={refetch}
    >
      {summaries !== undefined && (
        <>
          {showHeader && (
            <div className="schematic-header">
              <h2>{headerText}</h2>
            </div>
          )}
          {summaries.length === 0 ? (
            <p className="schematic-muted schematic-credit-usage__empty">
              No credits
            </p>
          ) : (
            <div className="schematic-credit-usage__credits">
              {summaries.map((summary) => (
                <CreditCard
                  key={summary.credit.id}
                  buyMoreTarget={buyMoreTarget}
                  buyMoreUrl={buyMoreUrl}
                  showBundles={showBundles}
                  showDescription={showDescription}
                  showExpiry={showExpiry}
                  showIcons={showIcons}
                  showLedger={showLedger}
                  summary={summary}
                  visibleGrantCount={visibleGrantCount}
                  onBuyBundle={onBuyBundle}
                />
              ))}
            </div>
          )}
        </>
      )}
    </StatusFrame>
  );
}

interface CreditCardProps {
  buyMoreTarget?: string;
  buyMoreUrl?: string;
  onBuyBundle?: CreditUsageProps["onBuyBundle"];
  showBundles: boolean;
  showDescription: boolean;
  showExpiry: boolean;
  showIcons: boolean;
  showLedger: boolean;
  summary: CreditBalanceSummary;
  visibleGrantCount: number;
}

function CreditCard({
  buyMoreTarget,
  buyMoreUrl,
  onBuyBundle,
  showBundles,
  showDescription,
  showExpiry,
  showIcons,
  showLedger,
  summary,
  visibleGrantCount,
}: CreditCardProps) {
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [allGrants, setAllGrants] = useState(false);
  const { credit, ledger } = summary;
  const rows = allGrants ? ledger : ledger.slice(0, visibleGrantCount);
  const canExpand = ledger.length > visibleGrantCount;

  return (
    <article
      aria-label={credit.name}
      className={cx(
        "schematic-card",
        "schematic-feature",
        "schematic-credit-usage__credit",
        `schematic-credit-usage__credit--${summary.state}`,
      )}
      data-testid="sch-credit"
    >
      <div className="schematic-feature__row">
        {showIcons && summary.icon !== null && <Icon name={summary.icon} />}
        <div className="schematic-feature__name">
          <h3 className="schematic-credit-usage__name">{credit.name}</h3>
          {showDescription && credit.description !== "" && (
            <p className="schematic-feature__description">
              {credit.description}
            </p>
          )}
        </div>
        <div
          className="schematic-feature__detail schematic-credit-usage__usage"
          data-testid="sch-credit-usage"
        >
          {summary.usedText} / {summary.totalText}
        </div>
      </div>

      <Meter
        label={credit.name}
        percent={summary.percentUsed ?? 0}
        state={summary.state}
      />

      <div className="schematic-credit-usage__summary">
        <span data-testid="sch-credit-remaining">
          {summary.remainingText} {summary.unit} remaining
        </span>
        {showExpiry && summary.expiresAt !== null && (
          <span className="schematic-muted schematic-small">
            Expires {summary.expiresAt.text}
          </span>
        )}
      </div>

      {showLedger && ledger.length > 0 && (
        <details
          className="schematic-credit-usage__ledger"
          data-testid="sch-credit-ledger"
          open={ledgerOpen}
        >
          <summary
            className="schematic-link-button"
            onClick={(event) => {
              event.preventDefault();
              setLedgerOpen((value) => !value);
            }}
          >
            {ledgerOpen ? "Hide balance details" : "See balance details"}
          </summary>
          <ul className="schematic-credit-usage__grants">
            {rows.map((row) => {
              const detail = ledgerDetail(row);
              return (
                <li
                  key={row.id}
                  className="schematic-credit-usage__grant"
                  data-testid="sch-credit-grant"
                >
                  <span>{ledgerText(row)}</span>
                  {detail !== null && (
                    <span className="schematic-muted schematic-small">
                      {detail}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {canExpand && (
            <button
              className="schematic-link-button schematic-credit-usage__show-all"
              type="button"
              onClick={() => setAllGrants((value) => !value)}
            >
              {allGrants ? "Hide all" : `See all (${ledger.length})`}
            </button>
          )}
        </details>
      )}

      {summary.canBuyMore && (
        <div className="schematic-credit-usage__buy">
          <div className="schematic-feature__actions">
            <Cta
              className="schematic-cta--small"
              target={buyMoreTarget}
              url={buyMoreUrl}
              onClick={() => onBuyBundle?.(summary, summary.bundles)}
            >
              Buy more
            </Cta>
          </div>
          {showBundles && (
            <ul
              className="schematic-credit-usage__bundles schematic-small schematic-muted"
              data-testid="sch-credit-bundles"
            >
              {summary.bundles.map((bundle) => (
                <li key={bundle.id}>{bundleText(bundle)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

/** "500 AI credits included in plan" — the primary line of a ledger row. */
function ledgerText(row: LedgerRow): string {
  const amount = `${row.quantityText} ${row.unit}`;
  switch (row.kind) {
    case "plan":
      return `${amount} included in plan`;
    case "purchased":
      return `${amount} bundle purchased ${row.createdAtText}`;
    case "auto_topup":
      return `${amount} auto top-up purchased ${row.createdAtText}`;
    case "promotional":
      return `${row.quantityText} promotional ${row.unit} granted ${row.createdAtText}`;
    case "other":
      return `${amount} added ${row.createdAtText}`;
  }
}

/** "Resets …" for plan grants, "Expires …" for the rest; null when neither. */
function ledgerDetail(row: LedgerRow): string | null {
  if (row.resetsAt !== null) {
    return `Resets ${row.resetsAt.text}`;
  }
  if (row.expiresAt !== null) {
    return `Expires ${row.expiresAt.text}`;
  }
  return null;
}

/** "500 AI credits — $25.00" / "Custom pack — $0.05 per AI credit". */
function bundleText(bundle: BundleOffer): string {
  if (bundle.priceText === null) {
    return bundle.name;
  }
  const price = bundle.isPerCredit
    ? `${bundle.priceText} per ${bundle.unit}`
    : bundle.priceText;
  return `${bundle.name} — ${price}`;
}

export default CreditUsage;
