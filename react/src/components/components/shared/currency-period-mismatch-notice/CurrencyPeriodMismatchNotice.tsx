import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import { Flex, Icon, Text } from "../../ui";

interface CurrencyPeriodMismatchNoticeProps {
  currency: string;
  period: string;
}

/**
 * Shown when the checkout is pinned (via the bypass config) to a currency and
 * billing period the selected plan does not price together. We surface a hard,
 * visible error rather than silently charging in the plan's default currency.
 */
export const CurrencyPeriodMismatchNotice = ({
  currency,
  period,
}: CurrencyPeriodMismatchNoticeProps) => {
  const { settings } = useEmbed();
  const { t } = useTranslation();

  return (
    <Flex
      data-testid="sch-currency-period-mismatch-notice"
      $flexDirection="column"
      $alignItems="center"
      $gap="0.75rem"
      $padding="1.5rem 2rem"
      $maxWidth="28rem"
      $borderWidth="1px"
      $borderStyle="solid"
      $borderColor={settings.theme.danger}
      $borderRadius="0.5rem"
    >
      <Icon name="info-rounded" color={settings.theme.danger} size="lg" />

      <Text $weight={600} $size={16} $color={settings.theme.danger}>
        {t("This plan is not available in the selected currency and period.")}
      </Text>

      <Text
        $size={13}
        $color={settings.theme.danger}
        style={{ opacity: 0.85, textAlign: "center" }}
      >
        {t("No {{currency}} price for the {{period}} billing period.", {
          currency: currency.toUpperCase(),
          period,
        })}
      </Text>
    </Flex>
  );
};
