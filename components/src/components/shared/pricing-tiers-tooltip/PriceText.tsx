import { useMemo } from "react";

import type { Feature } from "../../../types";
import { formatCurrency, getFeatureName, shortenPeriod } from "../../../utils";
import { Text } from "../../ui";

interface PriceTextProps {
  feature: Feature;
  period?: string;
  currency?: string;
  flatAmount?: number;
  perUnitPrice?: number;
}

export const PriceText = ({
  feature,
  period,
  currency,
  flatAmount = 0,
  perUnitPrice = 0,
}: PriceTextProps) => {
  const text = useMemo(() => {
    if (!flatAmount && perUnitPrice) {
      return (
        <>
          {formatCurrency(perUnitPrice, currency)}
          <sub>/{getFeatureName(feature, 1)}</sub>
        </>
      );
    }

    if (flatAmount && !perUnitPrice) {
      return (
        <>
          {formatCurrency(flatAmount, currency)}
          {period && <sub>/{shortenPeriod(period)}</sub>}
        </>
      );
    }

    return (
      <>
        {formatCurrency(perUnitPrice, currency)}
        <sub>/{getFeatureName(feature, 1)}</sub>
        {" + "}
        {formatCurrency(flatAmount, currency)}
        {period && <sub>/{shortenPeriod(period)}</sub>}
      </>
    );
  }, [feature, period, currency, flatAmount, perUnitPrice]);

  return <Text $leading={1}>{text}</Text>;
};
