import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type BillingProductPriceTierResponseData } from "../../../api/checkoutexternal";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { formatCurrency, pluralize } from "../../../utils";
import { Box, Flex, Icon, Text, Tooltip } from "../../ui";

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

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const tiers = useMemo(() => {
    let start = 1;
    return priceTiers.map((tier) => {
      const { upTo, ...rest } = tier;
      const end = upTo ?? Infinity;
      const mapped = {
        ...rest,
        from: start,
        to: end,
      };

      start = end + 1;

      return mapped;
    });
  }, [priceTiers]);

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
        <Flex $flexDirection="column" $gap="1rem">
          <dl>
            {tiers.reduce((acc: React.ReactNode[], tier, index) => {
              const perUnitPrice =
                typeof tier.perUnitPriceDecimal === "string"
                  ? Number(tier.perUnitPriceDecimal)
                  : tier.perUnitPrice;

              if (perUnitPrice || tier.flatAmount) {
                acc.push(
                  <Flex
                    key={index}
                    $justifyContent="space-between"
                    $gap="1rem"
                    $padding="0.5rem"
                  >
                    <dt>
                      <Text>
                        {tier.from}
                        {tier.to === Infinity ? "+" : `–${tier.to}`}
                      </Text>
                    </dt>

                    <dd>
                      <Text>
                        {perUnitPrice ? (
                          <>
                            {formatCurrency(perUnitPrice, currency)}/
                            {pluralize(featureName, 1)}
                            {tier.flatAmount && (
                              <>
                                {" "}
                                + {formatCurrency(tier.flatAmount, currency)}
                              </>
                            )}
                          </>
                        ) : (
                          tier.flatAmount &&
                          formatCurrency(tier.flatAmount, currency)
                        )}
                      </Text>
                    </dd>
                  </Flex>,
                );
              }

              return acc;
            }, [])}
          </dl>
          {showMode && (
            <>
              <hr
                style={{
                  border: "none",
                  borderBottom: `1px solid ${settings.theme.typography.text.color}`,
                  opacity: 0.25,
                }}
              />
              <Box>
                <Text>
                  ℹ️{" "}
                  {tiersMode === "volume"
                    ? t("Price by unit based on final tier reached.")
                    : t("Tiers apply progressively as quantity increases.")}
                </Text>
              </Box>
            </>
          )}
        </Flex>
      }
      $flexGrow="0 !important"
      $width="auto !important"
    />
  );
};
