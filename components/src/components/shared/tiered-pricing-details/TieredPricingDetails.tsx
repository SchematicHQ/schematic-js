import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type PlanEntitlementResponseData } from "../../../api/checkoutexternal";
import {
  formatCurrency,
  getEntitlementPrice,
  pluralize,
  shortenPeriod,
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
      units: pluralize(entitlement.feature.name, upTo),
    });
  }

  if (flatAmount === 0 && perUnitPrice > 0) {
    return t("Up to X units at $Y/unit", {
      X: upTo,
      units: pluralize(entitlement.feature.name),
      Y: formatCurrency(perUnitPrice, currency),
      unit: pluralize(entitlement.feature.name, 1),
    });
  }

  if (flatAmount > 0 && perUnitPrice === 0) {
    return t("Up to X units for $Y/period", {
      X: upTo,
      units: pluralize(entitlement.feature.name),
      Y: formatCurrency(flatAmount, currency),
      period,
    });
  }

  if (flatAmount > 0 && perUnitPrice > 0) {
    return t("Up to X units at $Y/unit + $Z/period", {
      amount: upTo,
      perUnitPrice: formatCurrency(perUnitPrice, currency),
      featureName: pluralize(entitlement.feature.name, 1),
      flatAmount: formatCurrency(flatAmount, currency),
      period: shortenPeriod(period),
    });
  }
};
