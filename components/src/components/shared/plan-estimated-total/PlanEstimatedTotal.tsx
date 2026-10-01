import { BillingProductPriceInterval } from "../../../api/checkoutexternal";
import { useEmbed } from "../../../hooks";
import {
  useTranslation,
  type SchematicTranslationKey,
} from "../../../localization";
import type { Plan } from "../../../types";
import { formatCurrency, getPlanEstimatedPrice } from "../../../utils";
import { Box, Text } from "../../ui";

interface PlanEstimatedTotalProps {
  plan: Plan;
  period: string;
  planPrice?: number;
  currency?: string;
}

/**
 * Labels a plan card's headline price as the server's estimate at the
 * company's current usage, and names the plan's base price it replaced.
 * Renders nothing when the card shows the plan's own price.
 */
export const PlanEstimatedTotal = ({
  plan,
  period,
  planPrice,
  currency,
}: PlanEstimatedTotalProps) => {
  const { t, locale } = useTranslation();

  const { data, settings } = useEmbed();

  if (getPlanEstimatedPrice(plan, period, planPrice, currency) === undefined) {
    return null;
  }

  const showAsMonthlyPrices =
    data?.displaySettings?.showAsMonthlyPrices ?? false;
  const divisor = !showAsMonthlyPrices
    ? 1
    : period === BillingProductPriceInterval.Year
      ? 12
      : period === "quarter"
        ? 3
        : 1;

  return (
    <Box>
      <Text
        data-testid="sch-plan-estimated-total"
        $size={0.875 * settings.theme.typography.text.fontSize}
      >
        {planPrice
          ? t("Estimated at current usage with base price", {
              amount: formatCurrency(planPrice / divisor, {
                locale,
                currency,
                testSignificantDigits: divisor === 1,
              }),
              period: t(
                (divisor === 1 ? period : "month") as SchematicTranslationKey,
              ),
            })
          : t("Estimated at current usage")}
      </Text>
    </Box>
  );
};
