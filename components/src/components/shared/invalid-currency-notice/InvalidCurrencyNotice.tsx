import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import { Flex, Icon, Text } from "../../ui";

interface InvalidCurrencyNoticeProps {
  invalidEntries?: string[];
}

export const InvalidCurrencyNotice = ({
  invalidEntries = [],
}: InvalidCurrencyNoticeProps) => {
  const { settings } = useEmbed();
  const { t } = useTranslation();

  return (
    <Flex
      data-testid="sch-invalid-currency-notice"
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
        {t("No supported currencies are available.")}
      </Text>

      {invalidEntries.length > 0 && (
        <Text
          $size={13}
          $color={settings.theme.danger}
          style={{ opacity: 0.85, textAlign: "center" }}
        >
          {t("Invalid currency filter: {{entries}}", {
            entries: invalidEntries.join(", "),
          })}
        </Text>
      )}
    </Flex>
  );
};
