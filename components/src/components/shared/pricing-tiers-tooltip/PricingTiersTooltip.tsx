import { useTranslation } from "react-i18next";

import { type BillingProductPriceTierResponseData } from "../../../api/checkoutexternal";
import { useIsLightBackground } from "../../../hooks";
import { formatCurrency, pluralize } from "../../../utils";
import { Flex, Icon, Text, Tooltip } from "../../ui";

interface PricingTiersTooltipProps {
  featureName: string;
  currency?: string;
  priceTiers?: BillingProductPriceTierResponseData[];
  tiersMode?: string;
  showMode?: boolean;
}

export const PricingTiersTooltip = ({
  featureName,
  priceTiers = [],
  currency,
  tiersMode,
  showMode = false,
}: PricingTiersTooltipProps) => {
  const { t } = useTranslation();

  const isLightBackground = useIsLightBackground();

  if (!priceTiers.length) {
    return null;
  }

  return (
    <Tooltip
      trigger={
        <Icon
          title="tiered pricing"
          name="info-rounded"
          color={`hsla(0, 0%, ${isLightBackground ? 0 : 100}%, 0.5)`}
          style={{ marginLeft: `-${1 / 3}rem` }}
        />
      }
      content={
        <>
          <dl>
            {priceTiers?.reduce((acc: React.ReactNode[], tier, index, arr) => {
              const start = arr[index - 1]?.upTo ?? 0;
              const prices: React.ReactNode[] = [];

              if (tier.flatAmount) {
                prices.push(formatCurrency(tier.flatAmount, currency));
              }

              if (tier.perUnitPrice) {
                prices.push(formatCurrency(tier.perUnitPrice, currency));
              }

              if (prices.length > 0) {
                acc.push(
                  <Flex
                    key={index}
                    $justifyContent="space-between"
                    $gap="1rem"
                    $padding="0.5rem"
                  >
                    <dt>
                      {start + 1}–{tier.upTo}
                    </dt>

                    <dd>
                      {prices.join(" + ")}/{pluralize(featureName, 1)}
                    </dd>
                  </Flex>,
                );
              }

              return acc;
            }, [])}
          </dl>
          {showMode && (
            <Text>
              ℹ️{" "}
              {tiersMode === "volume"
                ? t("Price by unit based on final tier reached.")
                : t("Tiers apply progressively as quantity increases.")}
            </Text>
          )}
        </>
      }
      $flexGrow="0 !important"
      $width="auto !important"
    />
  );
};
