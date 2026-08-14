import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import type { Credit } from "../../../types";
import { findLicenseSource, getFeatureName } from "../../../utils";
import { Flex, Text } from "../../ui";

interface LicenseEntitlementSource {
  feature?: {
    licenseId?: string | null;
    name: string;
    singularName?: string | null;
    pluralName?: string | null;
  } | null;
}

interface PlanCreditTextProps {
  credit: Credit;
  /** license lookup source — the plan's entitlements */
  entitlements?: LicenseEntitlementSource[] | null;
  /** appended to the primary line (e.g. an auto top-up notice) */
  children?: React.ReactNode;
}

/**
 * A plan card's credit value prop. A per-license grant reads as
 * "100 Credits per User Seat per month", with any flat company grant on the
 * same credit as a secondary "+ 500 Credits per month for your company" line;
 * flat-only grants keep the plain "500 Credits per month" copy.
 */
export const PlanCreditText = ({
  credit,
  entitlements,
  children,
}: PlanCreditTextProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const perLicenseGrant =
    credit.perLicenseGrants.length === 1
      ? credit.perLicenseGrants[0]
      : undefined;
  const licenseFeature = perLicenseGrant
    ? findLicenseSource(entitlements ?? [], perLicenseGrant.licenseId)?.feature
    : undefined;

  if (!perLicenseGrant) {
    return (
      <Text>
        {credit.quantity} {getFeatureName(credit, credit.quantity)}
        {credit.period && (
          <>
            {" "}
            {t("per")} {t(credit.period)}
          </>
        )}
        {children}
      </Text>
    );
  }

  const licenseName = licenseFeature
    ? getFeatureName(licenseFeature, 1)
    : t("license");

  return (
    <Flex $flexDirection="column" $gap="0.25rem">
      <Text>
        {credit.period
          ? t("X credits per license per period", {
              amount: perLicenseGrant.amount,
              creditName: getFeatureName(credit, perLicenseGrant.amount),
              licenseName,
              period: t(credit.period),
            })
          : t("X credits per license", {
              amount: perLicenseGrant.amount,
              creditName: getFeatureName(credit, perLicenseGrant.amount),
              licenseName,
            })}
        {children}
      </Text>

      {credit.fixedQuantity > 0 && credit.period && (
        <Text
          style={{ opacity: 0.54 }}
          $size={0.875 * settings.theme.typography.text.fontSize}
          $color={settings.theme.typography.text.color}
        >
          {t("Plus X credits per period for your company", {
            amount: credit.fixedQuantity,
            creditName: getFeatureName(credit, credit.fixedQuantity),
            period: t(credit.period),
          })}
        </Text>
      )}
    </Flex>
  );
};
