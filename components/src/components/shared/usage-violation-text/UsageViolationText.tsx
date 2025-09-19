import { useTranslation } from "react-i18next";

import { FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { useEmbed } from "../../../hooks";
import { Text } from "../../ui";

export interface UsageViolationsProps {
  violations: FeatureUsageResponseData[];
}

export const UsageViolationText = ({ violations }: UsageViolationsProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  return (
    <Text
      $size={0.875 * settings.theme.typography.text.fontSize}
      $leading={1.35}
      style={{ opacity: 0.625 }}
    >
      {t("Cannot change to this plan.", {
        reason: violations.reduce((acc: string[], violation) => {
          if (violation.feature) {
            acc.push(violation.feature.name);
          }

          return acc;
        }, []),
      })}
    </Text>
  );
};
