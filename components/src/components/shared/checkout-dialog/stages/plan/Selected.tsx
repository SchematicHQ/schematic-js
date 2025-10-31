import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../../../hooks";
import { Flex, Icon, Text } from "../../../../ui";

interface SelectedProps {
  isCurrent?: boolean;
  isTrial?: boolean;
}

export const Selected = ({
  isCurrent = false,
  isTrial = false,
}: SelectedProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const text = useMemo(() => {
    if (isCurrent) {
      return isTrial ? t("Trial in progress") : t("Current plan");
    }

    return isTrial ? t("Trial selected") : t("Plan selected");
  }, [t, isCurrent, isTrial]);

  return (
    <Flex
      $justifyContent="center"
      $alignItems="center"
      $gap="0.25rem"
      $padding="0.625rem 0"
    >
      <Icon name="check-rounded" color={settings.theme.primary} />

      <Text
        $size={0.9375 * settings.theme.typography.text.fontSize}
        $leading={1}
      >
        {text}
      </Text>
    </Flex>
  );
};
