import { useMemo, useState } from "react";

import { cx } from "./common";
import {
  featureName,
  formatCurrency,
  formatNumber,
  type TierRange,
} from "./model";
import type { Translator } from "./strings";

/** Users shown before the per-user list is expanded. */
const COLLAPSED_USER_COUNT = 3;
/** Users the expanded list holds; the rest are reported as a count. */
const EXPANDED_USER_COUNT = 20;

/**
 * Pieces the usage elements share: the pricing-tiers table a tooltip holds,
 * and the short period names that suffix a price.
 */

/** "mo", "qtr" or "yr"; nothing for a period without an abbreviation. */
export function shortPeriod(period: string, t: Translator): string | undefined {
  switch (period) {
    case "month":
      return t("periodMonthShort");
    case "quarter":
      return t("periodQuarterShort");
    case "year":
      return t("periodYearShort");
    default:
      return undefined;
  }
}

/** The price's tiers, "1–100 $0.01/call", with the tiers mode beneath. */
export function PriceTiers({
  currency,
  locale,
  mode,
  period,
  ranges,
  t,
  unit,
}: {
  currency: string;
  locale: string;
  mode: "graduated" | "volume" | null;
  /** A period key, for flat fees billed per period. */
  period: string | null;
  ranges: TierRange[];
  t: Translator;
  /** The singular unit a per-unit price is per. */
  unit: string;
}) {
  const perPeriod = period === null ? undefined : shortPeriod(period, t);
  const money = (amount: number) => formatCurrency(amount, currency, locale);
  const perUnit = (amount: number) => (
    <>
      {money(amount)}
      <sub>/{unit}</sub>
    </>
  );
  const flat = (amount: number) => (
    <>
      {money(amount)}
      {perPeriod !== undefined && <sub>/{perPeriod}</sub>}
    </>
  );
  const tierPrice = (flatPrice: number, perUnitPrice: number) => {
    if (flatPrice === 0 && perUnitPrice !== 0) {
      return perUnit(perUnitPrice);
    }
    if (flatPrice !== 0 && perUnitPrice === 0) {
      return flat(flatPrice);
    }
    return (
      <>
        {perUnit(perUnitPrice)}
        {" + "}
        {flat(flatPrice)}
      </>
    );
  };
  return (
    <span className="schematic-tiers">
      <dl className="schematic-tiers__list">
        {ranges.map((tier) => (
          <div className="schematic-tiers__tier" key={tier.from}>
            <dt className="schematic-tiers__range">
              {formatNumber(tier.from, locale)}
              {tier.to === null
                ? "+"
                : tier.to !== tier.from
                  ? `–${formatNumber(tier.to, locale)}`
                  : ""}
            </dt>
            <dd className="schematic-tiers__price">
              {tierPrice(tier.flatPrice ?? 0, tier.perUnitPrice ?? 0)}
            </dd>
          </div>
        ))}
      </dl>
      {mode !== null && (
        <span className="schematic-tiers__mode">
          {mode === "volume" ? t("usageTiersVolume") : t("usageTiersGraduated")}
        </span>
      )}
    </span>
  );
}

/** Usage by user of a feature or a credit. */
export interface UserBreakdownData {
  /** Users across all pages, not counting unattributed usage. */
  count: number;
  total: number;
  unattributed: number | null;
  users: { amount: number; id: string; label: string }[];
}

/**
 * Who on the team used a feature or a credit, heaviest first: three, then up
 * to twenty with the rest as a count. Renders nothing while loading or when
 * nobody has; a failure offers a retry without failing the card.
 */
export function UserBreakdown({
  breakdown,
  error,
  locale,
  onRetry,
  t,
  unit,
}: {
  breakdown: UserBreakdownData | undefined;
  error: Error | undefined;
  locale: string;
  onRetry: () => void;
  t: Translator;
  /** What every amount is counted in. */
  unit: {
    name: string;
    singularName?: string | null;
    pluralName?: string | null;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const users = useMemo(
    () => [...(breakdown?.users ?? [])].sort((a, b) => b.amount - a.amount),
    [breakdown?.users],
  );

  const amount = (value: number) =>
    `${formatNumber(value, locale)} ${featureName(unit, value, locale)}`;

  if (breakdown === undefined && error !== undefined) {
    return (
      <div className="schematic-usage-by-user" role="alert">
        <span className="schematic-usage-by-user__title">
          {t("usageByUserHeader")}
        </span>
        <span className="schematic-error">{t("usageByUserError")}</span>
        <button
          className="schematic-cta schematic-cta--small schematic-cta--ghost schematic-status__retry"
          type="button"
          onClick={onRetry}
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const unattributed = breakdown?.unattributed ?? null;
  if (
    breakdown === undefined ||
    (users.length === 0 && unattributed === null)
  ) {
    return null;
  }

  const visible = users.slice(
    0,
    expanded ? EXPANDED_USER_COUNT : COLLAPSED_USER_COUNT,
  );
  const remaining = Math.max(breakdown.count - visible.length, 0);
  const hidden = Math.max(
    Math.min(breakdown.count, EXPANDED_USER_COUNT) -
      Math.min(users.length, COLLAPSED_USER_COUNT),
    0,
  );
  const expandLabel =
    breakdown.count > EXPANDED_USER_COUNT
      ? t("usageByUserShowTop", {
          count: EXPANDED_USER_COUNT,
          shown: formatNumber(EXPANDED_USER_COUNT, locale),
        })
      : hidden > 0
        ? t("usageByUserShowAllCount", {
            count: breakdown.count,
            shown: formatNumber(breakdown.count, locale),
          })
        : t("usageByUserShowAll");

  const user = (key: string, label: string, value: number, muted = false) => (
    <li className="schematic-usage-by-user__user" key={key}>
      <span aria-hidden="true" className="schematic-usage-by-user__avatar">
        {muted ? "?" : (label.trim()[0] ?? "?").toUpperCase()}
      </span>
      <span
        className={cx(
          "schematic-usage-by-user__name",
          muted && "schematic-muted",
        )}
      >
        {label}
      </span>
      <span className="schematic-muted schematic-usage-by-user__amount">
        {amount(value)}
      </span>
    </li>
  );

  return (
    <div className="schematic-usage-by-user">
      <span className="schematic-usage-by-user__title">
        {t("usageByUserHeader")}
      </span>
      <span className="schematic-muted">
        {t("usageByUserTotal", { amount: amount(breakdown.total) })}
      </span>
      <ul className="schematic-usage-by-user__list">
        {visible.map((entry) => user(entry.id, entry.label, entry.amount))}
        {expanded &&
          unattributed !== null &&
          user(
            "unattributed",
            t("usageByUserUnattributed"),
            unattributed,
            true,
          )}
      </ul>
      {expanded && remaining > 0 && (
        <span className="schematic-muted">
          {t("usageByUserMore", {
            count: remaining,
            shown: formatNumber(remaining, locale),
          })}
        </span>
      )}
      {(hidden > 0 || unattributed !== null) && (
        <button
          aria-expanded={expanded}
          className="schematic-link-button schematic-usage-by-user__toggle"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          <i
            aria-hidden="true"
            className={`schematic-icon schematic-icon--${expanded ? "chevron-up" : "chevron-down"} schematic-chevron`}
          />
          <span className="schematic-link-button__label">
            {expanded ? t("usageByUserShowFewer") : expandLabel}
          </span>
        </button>
      )}
    </div>
  );
}
