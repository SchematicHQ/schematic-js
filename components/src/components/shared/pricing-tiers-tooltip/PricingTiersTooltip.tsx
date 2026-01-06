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
  portal?: HTMLElement | null;
}

export const PricingTiersTooltip = ({
  feature,
  period,
  currency,
  priceTiers = [],
  tiersMode,
  portal,
}: PricingTiersTooltipProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const { tiers } = useMemo(() => {
    return priceTiers.reduce(
      (
        acc: {
          start: number;
          tiers: {
            flatAmount?: number;
            perUnitPrice?: number;
            perUnitPriceDecimal?: string;
            from: number;
            to: number;
          }[];
        },
        tier,
      ) => {
        const end = tier.upTo ?? Infinity;

        acc.tiers.push({
          flatAmount: tier.flatAmount ?? undefined,
          perUnitPrice: tier.perUnitPrice ?? undefined,
          perUnitPriceDecimal: tier.perUnitPriceDecimal ?? undefined,
          from: acc.start,
          to: end,
        });

        acc.start = end + 1;

        return acc;
      },
      { start: 1, tiers: [] },
    );
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
                    <Text
                      $size={0.875 * settings.theme.typography.text.fontSize}
                    >
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
                <Text $size={0.875 * settings.theme.typography.text.fontSize}>
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
      portal={portal}
    />
  );
};
