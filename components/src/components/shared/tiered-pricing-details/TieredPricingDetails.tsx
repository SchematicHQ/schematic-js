import { useMemo } from "react";

import { type PlanEntitlementResponseData } from "../../../api/checkoutexternal";
import { useTranslation } from "../../../localization";
import {
  formatCurrency,
  getEntitlementPrice,
  getFeatureName,
} from "../../../utils";

export interface TieredPricingDetailsProps {
  entitlement: PlanEntitlementResponseData;
  period: string;
  currency?: string;
}

export const TieredPricingDetails = ({
  entitlement,
  period,
  currency: selectedCurrency,
}: TieredPricingDetailsProps) => {
  const { t, locale } = useTranslation();

  const { currency, flatAmount, perUnitPrice, upTo } = useMemo(() => {
    const { currency, priceTier } =
      getEntitlementPrice(entitlement, period, selectedCurrency) || {};

    const { flatAmount, perUnitPrice, perUnitPriceDecimal, upTo } =
      priceTier?.[0] || {};

    return {
      currency,
      flatAmount: flatAmount || 0,
      perUnitPrice:
        typeof perUnitPriceDecimal === "string"
          ? Number(perUnitPriceDecimal)
          : perUnitPrice || 0,
      upTo: upTo || undefined,
    };
  }, [entitlement, period, selectedCurrency]);

  if (!entitlement.feature) {
    return null;
  }

  if (flatAmount === 0 && perUnitPrice === 0) {
    return t("Up to X units for free", {
      X: upTo,
      units: getFeatureName(entitlement.feature, locale, upTo),
    });
  }

  if (flatAmount === 0 && perUnitPrice > 0) {
    return t("Up to X units at $Y/unit", {
      X: upTo,
      units: getFeatureName(entitlement.feature, locale, upTo),
      Y: formatCurrency(perUnitPrice, { locale, currency }),
      unit: getFeatureName(entitlement.feature, locale, 1),
    });
  }

  if (flatAmount > 0 && perUnitPrice === 0) {
    return t("Up to X units for $Y/period", {
      X: upTo,
      units: getFeatureName(entitlement.feature, locale, upTo),
      Y: formatCurrency(flatAmount, { locale, currency }),
      period,
    });
  }

  if (flatAmount > 0 && perUnitPrice > 0) {
    return t("Up to X units at $Y/unit + $Z/period", {
      X: upTo,
      units: getFeatureName(entitlement.feature, locale, upTo),
      Y: formatCurrency(perUnitPrice, { locale, currency }),
      unit: getFeatureName(entitlement.feature, locale, 1),
      Z: formatCurrency(flatAmount, { locale, currency }),
      period,
    });
  }
};
