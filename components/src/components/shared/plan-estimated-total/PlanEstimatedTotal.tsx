import { BillingProductPriceInterval } from "../../../api/checkoutexternal";
import { useEmbed } from "../../../hooks";
import {
  useTranslation,
  type SchematicTranslationKey,
} from "../../../localization";
import type { Plan } from "../../../types";
import { formatCurrency, getPlanEstimatedTotal } from "../../../utils";
import { Box, Text } from "../../ui";

interface PlanEstimatedTotalProps {
  plan: Plan;
  period: string;
  planPrice?: number;
  currency?: string;
}

/**
 * The plan's price at the company's current usage, computed by the server.
 * Renders nothing without an estimate, or when usage adds nothing to the price
 * shown above it.
 */
export const PlanEstimatedTotal = ({
  plan,
  period,
  planPrice,
  currency,
}: PlanEstimatedTotalProps) => {
  const { t, locale } = useTranslation();

  const { data, settings } = useEmbed();

  const estimate = getPlanEstimatedTotal(plan, period, currency);
  if (plan.custom || !estimate || estimate.amount === (planPrice ?? 0)) {
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
        {t("Estimated at current usage", {
          amount: formatCurrency(estimate.amount / divisor, {
            locale,
            currency: currency ?? estimate.currency,
            testSignificantDigits: divisor === 1,
          }),
          period: t(
            (divisor === 1 ? period : "month") as SchematicTranslationKey,
          ),
        })}
      </Text>
    </Box>
  );
};
