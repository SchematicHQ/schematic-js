import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import type { Credit, PerLicenseCreditGrant } from "../../../types";
import {
  findLicenseSource,
  findSoleLicenseSource,
  getFeatureName,
} from "../../../utils";
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
 * flat-only grants keep the plain "500 Credits per month" copy. A credit
 * scaled by more than one license gets one line per license.
 */
export const PlanCreditText = ({
  credit,
  entitlements,
  children,
}: PlanCreditTextProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const sources = entitlements ?? [];
  const { perLicenseGrants } = credit;

  if (perLicenseGrants.length === 0) {
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

  const resolveLicenseName = (grant: PerLicenseCreditGrant) => {
    // A grant that names no license still scales by the plan's license when
    // the plan sells exactly one, so prefer that name over the generic word.
    const licenseFeature = (
      findLicenseSource(sources, grant.licenseId) ??
      (grant.licenseId ? undefined : findSoleLicenseSource(sources))
    )?.feature;

    return licenseFeature ? getFeatureName(licenseFeature, 1) : t("license");
  };

  return (
    <Flex $flexDirection="column" $gap="0.25rem">
      {perLicenseGrants.map((grant, grantIndex) => (
        <Text key={grantIndex}>
          {credit.period
            ? t("X credits per license per period", {
                amount: grant.amount,
                creditName: getFeatureName(credit, grant.amount),
                licenseName: resolveLicenseName(grant),
                period: t(credit.period),
              })
            : t("X credits per license", {
                amount: grant.amount,
                creditName: getFeatureName(credit, grant.amount),
                licenseName: resolveLicenseName(grant),
              })}
          {grantIndex === 0 && children}
        </Text>
      ))}

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
