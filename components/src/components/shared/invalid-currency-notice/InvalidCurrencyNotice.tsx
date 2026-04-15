import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import { Flex, Text } from "../../ui";

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
      $justifyContent="center"
      $alignItems="center"
      $gap="0.5rem"
      $padding="1.5rem"
      $borderWidth="1px"
      $borderStyle="solid"
      $borderColor={settings.theme.danger}
      $borderRadius="0.5rem"
    >
      <Text $weight={600} $color={settings.theme.danger}>
        {t("No supported currencies are available.")}
      </Text>

      {invalidEntries.length > 0 && (
        <Text $size={13} $color={settings.theme.danger}>
          {t("Invalid currency filter: {{entries}}", {
            entries: invalidEntries.join(", "),
          })}
        </Text>
      )}
    </Flex>
  );
};
