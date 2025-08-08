import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type BillingProductPriceTierResponseData } from "../../../api/checkoutexternal";
import { TiersMode } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { Feature } from "../../../types";
import { Box, Flex, Icon, Text, Tooltip } from "../../ui";

import { PriceText } from "./PriceText";

interface PricingTiersTooltipProps {
  feature: Feature;
  period?: string;
  currency?: string;
  priceTiers?: BillingProductPriceTierResponseData[];
  tiersMode?: string;
}

export const PricingTiersTooltip = ({
  feature,
  period,
  currency,
  priceTiers = [],
  tiersMode,
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
            {tiers.map((tier, index) => {
              const flatAmount =
                typeof tier.flatAmount === "number"
                  ? tier.flatAmount
                  : undefined;

              const perUnitPrice =
                typeof tier.perUnitPriceDecimal === "string"
                  ? Number(tier.perUnitPriceDecimal)
                  : typeof tier.perUnitPrice === "number"
                    ? tier.perUnitPrice
                    : undefined;

              return (
                <Flex
                  key={index}
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                  $padding="0.5rem"
                >
                  <dt>
                    <Text>
                      {tier.from}
                      {tier.from !== tier.to && (
                        <>{tier.to === Infinity ? "+" : `–${tier.to}`}</>
                      )}
                    </Text>
                  </dt>

                  <dd>
                    <PriceText
                      period={period}
                      feature={feature}
                      flatAmount={flatAmount}
                      perUnitPrice={perUnitPrice}
                      currency={currency}
                    />
                  </dd>
                </Flex>
              );
            })}
          </dl>

          {(tiersMode === TiersMode.Volume ||
            tiersMode === TiersMode.Graduated) && (
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
                  {tiersMode === TiersMode.Volume
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
