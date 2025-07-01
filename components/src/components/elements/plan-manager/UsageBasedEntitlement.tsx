import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useEntitlement,
  useIsLightBackground,
  type EntitlementProps,
} from "../../../hooks";
import {
  darken,
  formatCurrency,
  getFeatureName,
  hexToHSL,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { Flex, Icon, Text, Tooltip } from "../../ui";

interface TitleProps {
  usageBasedEntitlement: EntitlementProps;
  fontStyle: FontStyle;
}

const Title = ({ usageBasedEntitlement, fontStyle }: TitleProps) => {
  if (!usageBasedEntitlement.feature) {
    return null;
  }

  return usageBasedEntitlement.limit ? (
    <Text display={fontStyle}>
      {usageBasedEntitlement.limit}{" "}
      {getFeatureName(
        usageBasedEntitlement.feature,
        usageBasedEntitlement.limit,
      )}
    </Text>
  ) : (
    getFeatureName(usageBasedEntitlement.feature)
  );
};

interface DescriptionProps {
  usageBasedEntitlement: EntitlementProps;
  period: string;
}

const Description = ({ usageBasedEntitlement, period }: DescriptionProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const description: React.ReactNode[] = [];

  if (usageBasedEntitlement.priceBehavior === "overage") {
    description.push(
      usageBasedEntitlement.amount ? (
        t("X additional", {
          amount: usageBasedEntitlement.amount,
        })
      ) : (
        <>{t("Additional")}: </>
      ),
    );
  }

  const {
    price,
    currency,
    packageSize = 1,
  } = usageBasedEntitlement.billingPrice || {};

  if (
    ((usageBasedEntitlement.priceBehavior === "overage" &&
      !usageBasedEntitlement.amount) ||
      usageBasedEntitlement.priceBehavior !== "tier") &&
    price &&
    usageBasedEntitlement.feature
  ) {
    description.push(
      <>
        {formatCurrency(price, currency)}
        <sub>
          /{packageSize > 1 && <>{packageSize} </>}
          {getFeatureName(usageBasedEntitlement.feature, packageSize)}
          {usageBasedEntitlement.feature.featureType === "trait" && (
            <>/{shortenPeriod(period)}</>
          )}
        </sub>
      </>,
    );
  }

  return (
    <Text
      $size={0.875 * settings.theme.typography.text.fontSize}
      $color={
        hexToHSL(settings.theme.typography.text.color).l > 50
          ? darken(settings.theme.typography.text.color, 0.46)
          : lighten(settings.theme.typography.text.color, 0.46)
      }
    >
      {description}
    </Text>
  );
};

interface InfoProps {
  usageBasedEntitlement: EntitlementProps;
}

const Info = ({ usageBasedEntitlement }: InfoProps) => {
  const isLightBackground = useIsLightBackground();

  if (usageBasedEntitlement.priceBehavior === "tier") {
    let from = 1;

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
            {usageBasedEntitlement.billingPrice?.priceTier.reduce(
              (acc: React.ReactNode[], tier, index) => {
                const start = from;
                from += tier.upTo ?? 0;

                if (tier.perUnitPrice) {
                  acc.push(
                    <Flex
                      key={index}
                      $justifyContent="space-between"
                      $gap="1rem"
                      $padding="0.5rem"
                    >
                      <dt>
                        {start}–{tier.upTo}
                      </dt>

                      <dd>
                        {formatCurrency(
                          tier.perUnitPrice ?? 0,
                          usageBasedEntitlement.billingPrice?.currency,
                        )}
                        {usageBasedEntitlement.feature?.name && (
                          <>/{usageBasedEntitlement.feature.name}</>
                        )}
                      </dd>
                    </Flex>,
                  );
                }

                return acc;
              },
              [],
            )}
          </dl>
        }
      />
    );
  }
};

interface CostProps {
  usageBasedEntitlement: EntitlementProps;
  period: string;
}

const Cost = ({ usageBasedEntitlement, period }: CostProps) => {
  if (usageBasedEntitlement.cost) {
    const { currency } = usageBasedEntitlement.billingPrice || {};

    return (
      <Text>
        {formatCurrency(usageBasedEntitlement.cost, currency)}
        <sub>/{shortenPeriod(period)}</sub>
      </Text>
    );
  }
};

export interface UsageBasedEntitlementProps {
  fontStyle: FontStyle;
  entitlement: FeatureUsageResponseData;
  period: string;
}

export const UsageBasedEntitlement = ({
  fontStyle,
  entitlement,
  period,
}: UsageBasedEntitlementProps) => {
  const usageBasedEntitlement = useEntitlement(entitlement, period);

  // this should never be the case since there should always be an associated feature,
  // but we need to satisfy all possible cases
  if (!usageBasedEntitlement.feature?.name) {
    return null;
  }

  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $flexWrap="wrap"
      $gap="1rem"
    >
      <Title
        usageBasedEntitlement={usageBasedEntitlement}
        fontStyle={fontStyle}
      />

      <Flex $alignItems="center" $gap="0.5rem">
        <Description
          usageBasedEntitlement={usageBasedEntitlement}
          period={period}
        />

        <Info usageBasedEntitlement={usageBasedEntitlement} />

        <Cost usageBasedEntitlement={usageBasedEntitlement} period={period} />
      </Flex>
    </Flex>
  );
};
