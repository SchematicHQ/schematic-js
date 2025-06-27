import { useTranslation } from "react-i18next";

import {
  type CurrentUsageBasedEntitlement,
  type UsageBasedEntitlement,
} from "../../../types";
import {
  formatCurrency,
  getEntitlementPrice,
  getFeatureName,
  shortenPeriod,
} from "../../../utils";
import { Box, Text } from "../../ui";

export const EntitlementRow = (
  entitlement: (UsageBasedEntitlement | CurrentUsageBasedEntitlement) & {
    planPeriod: string;
  },
) => {
  const { t } = useTranslation();

  const { feature, priceBehavior, quantity, softLimit, planPeriod } =
    entitlement;

  if (feature) {
    const {
      price,
      currency,
      packageSize = 1,
    } = getEntitlementPrice(entitlement, planPeriod) || {};

    return (
      <>
        <Box>
          <Text display="heading4">
            {priceBehavior === "pay_in_advance" ? (
              <>
                {quantity} {getFeatureName(feature, quantity)}
              </>
            ) : priceBehavior === "overage" && typeof softLimit === "number" ? (
              <>
                {softLimit} {getFeatureName(feature, softLimit)}
              </>
            ) : (
              feature.name
            )}
          </Text>
        </Box>

        <Box $whiteSpace="nowrap">
          <Text>
            {priceBehavior === "pay_in_advance" ? (
              <>
                {formatCurrency((price ?? 0) * quantity, currency)}
                <sub>/{shortenPeriod(planPeriod)}</sub>
              </>
            ) : (
              (priceBehavior === "pay_as_you_go" ||
                priceBehavior === "overage") && (
                <>
                  {priceBehavior === "overage" && <>{t("then")} </>}
                  {formatCurrency(price ?? 0, currency)}
                  <sub>
                    /{packageSize > 1 && <>{packageSize} </>}
                    {getFeatureName(feature, packageSize)}
                    {feature.featureType === "trait" && (
                      <>/{shortenPeriod(planPeriod)}</>
                    )}
                  </sub>
                </>
              )
            )}
          </Text>
        </Box>
      </>
    );
  }
};
