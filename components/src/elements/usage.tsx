import { formatCurrency, type TierRange } from "./model";
import type { Translator } from "./strings";

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
              {tier.from}
              {tier.to === null
                ? "+"
                : tier.to !== tier.from
                  ? `–${tier.to}`
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
