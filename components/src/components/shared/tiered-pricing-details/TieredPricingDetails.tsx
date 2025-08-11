import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type PlanEntitlementResponseData } from "../../../api/checkoutexternal";
import {
  formatCurrency,
  getEntitlementPrice,
  getFeatureName,
} from "../../../utils";

export interface TieredPricingDetailsProps {
  entitlement: PlanEntitlementResponseData;
  period: string;
}

export const TieredPricingDetails = ({
  entitlement,
  period,
}: TieredPricingDetailsProps) => {
  const { t } = useTranslation();

  const { currency, flatAmount, perUnitPrice, upTo } = useMemo(() => {
    const { currency, priceTier } =
      getEntitlementPrice(entitlement, period) || {};

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
  }, [entitlement, period]);

  if (!entitlement.feature) {
    return null;
  }

  if (flatAmount === 0 && perUnitPrice === 0) {
    return t("Up to X units for free", {
      X: upTo,
      units: getFeatureName(entitlement.feature, upTo),
    });
  }

  if (flatAmount === 0 && perUnitPrice > 0) {
    return t("Up to X units at $Y/unit", {
      X: upTo,
      units: getFeatureName(entitlement.feature, upTo),
      Y: formatCurrency(perUnitPrice, currency),
      unit: getFeatureName(entitlement.feature, 1),
    });
  }

  if (flatAmount > 0 && perUnitPrice === 0) {
    return t("Up to X units for $Y/period", {
      X: upTo,
      units: getFeatureName(entitlement.feature, upTo),
      Y: formatCurrency(flatAmount, currency),
      period,
    });
  }

  if (flatAmount > 0 && perUnitPrice > 0) {
    return t("Up to X units at $Y/unit + $Z/period", {
      X: upTo,
      units: getFeatureName(entitlement.feature, upTo),
      Y: formatCurrency(perUnitPrice, currency),
      unit: getFeatureName(entitlement.feature, 1),
      Z: formatCurrency(flatAmount, currency),
      period,
    });
  }
};
