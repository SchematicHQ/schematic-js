import { type BillingProductPriceTierResponseData } from "../../../api/checkoutexternal";
import { useIsLightBackground } from "../../../hooks";
import { formatCurrency } from "../../../utils";
import { Flex, Icon, Tooltip } from "../../ui";

interface EntitlementProps {
  featureName: string;
  priceTiers?: BillingProductPriceTierResponseData[];
  currency?: string;
}

export const PricingTiersTooltip = ({
  featureName,
  priceTiers = [],
  currency,
}: EntitlementProps) => {
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
        />
      }
      content={
        <dl>
          {priceTiers?.reduce((acc: React.ReactNode[], tier, index, arr) => {
            const start = arr.at(index - 1)?.upTo ?? 0;
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
                    {prices.join(" + ")}/{featureName}
                  </dd>
                </Flex>,
              );
            }

            return acc;
          }, [])}
        </dl>
      }
      $flexGrow="0 !important"
      $width="auto !important"
    />
  );
};
