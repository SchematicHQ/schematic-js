import { useMemo } from "react";

import { useEmbed } from "../../../hooks";
import { useTranslation } from "../../../localization";
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
  const { settings } = useEmbed();
  const { locale } = useTranslation();

  const text = useMemo(() => {
    if (!flatAmount && perUnitPrice) {
      return (
        <>
          {formatCurrency(perUnitPrice, { locale, currency })}
          <sub>/{getFeatureName(feature, 1)}</sub>
        </>
      );
    }

    if (flatAmount && !perUnitPrice) {
      return (
        <>
          {formatCurrency(flatAmount, { locale, currency })}
          {period && <sub>/{shortenPeriod(period)}</sub>}
        </>
      );
    }

    return (
      <>
        {formatCurrency(perUnitPrice, { locale, currency })}
        <sub>/{getFeatureName(feature, 1)}</sub>
        {" + "}
        {formatCurrency(flatAmount, { locale, currency })}
        {period && <sub>/{shortenPeriod(period)}</sub>}
      </>
    );
  }, [feature, period, currency, flatAmount, perUnitPrice, locale]);

  return (
    <Text
      $size={0.875 * settings.theme.typography.text.fontSize}
      $leading="none"
    >
      {text}
    </Text>
  );
};
