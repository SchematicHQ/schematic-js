import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import {
  darken,
  formatCurrency,
  getEntitlementCost,
  getFeatureName,
  hexToHSL,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { Flex, Icon, Text, Tooltip } from "../../ui";

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
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const { title, description, tooltip, cost } = useMemo(() => {
    const billingPrice =
      period === "year"
        ? entitlement.yearlyUsageBasedPrice
        : period === "month"
          ? entitlement.monthlyUsageBasedPrice
          : undefined;
    const { price, currency, packageSize = 1 } = billingPrice || {};

    let limit: number | undefined;
    if (
      entitlement.priceBehavior === "pay_in_advance" &&
      entitlement.allocation
    ) {
      limit = entitlement.allocation;
    } else if (
      entitlement.priceBehavior === "overage" &&
      entitlement.softLimit
    ) {
      limit = entitlement.softLimit;
    }

    // amount related to cost
    let amount: number | undefined;
    if (
      entitlement.priceBehavior === "pay_in_advance" &&
      entitlement.allocation
    ) {
      amount = entitlement.allocation;
    } else if (
      (entitlement.priceBehavior === "pay_as_you_go" ||
        entitlement.priceBehavior === "tier") &&
      entitlement.usage
    ) {
      amount = entitlement.usage;
    } else if (
      entitlement.priceBehavior === "overage" &&
      entitlement.usage &&
      entitlement.softLimit
    ) {
      amount = Math.max(0, entitlement.usage - entitlement.softLimit);
    }

    // total cost based on current usage or allocation
    const currentCost = getEntitlementCost(entitlement, period);

    let title: React.ReactNode;
    if (entitlement.feature) {
      title = limit ? (
        <>
          {limit} {getFeatureName(entitlement.feature, limit)}
        </>
      ) : (
        getFeatureName(entitlement.feature)
      );
    }

    const description: React.ReactNode[] = [];
    if (entitlement.priceBehavior === "overage") {
      description.push(
        amount ? (
          t("X additional", {
            amount: amount,
          })
        ) : (
          <>{t("Additional")}: </>
        ),
      );
    }

    if (
      ((entitlement.priceBehavior === "overage" && !amount) ||
        entitlement.priceBehavior !== "tier") &&
      price &&
      entitlement.feature
    ) {
      description.push(
        <>
          {formatCurrency(price, currency)}
          <sub>
            /{packageSize > 1 && <>{packageSize} </>}
            {getFeatureName(entitlement.feature, packageSize)}
            {entitlement.feature.featureType === "trait" && (
              <>/{shortenPeriod(period)}</>
            )}
          </sub>
        </>,
      );
    }

    let tooltip: React.ReactNode;
    if (entitlement.priceBehavior === "tier") {
      let from = 1;
      tooltip = (
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
              {billingPrice?.priceTier.reduce(
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
                            billingPrice.currency,
                          )}
                          {entitlement.feature?.name && (
                            <>/{entitlement.feature.name}</>
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

    let cost: React.ReactNode;
    if (currentCost) {
      cost = (
        <>
          {formatCurrency(currentCost, currency)}
          <sub>/{shortenPeriod(period)}</sub>
        </>
      );
    }

    return { title, description, tooltip, cost };
  }, [t, entitlement, period]);

  // this should never be the case since there should always be an associated feature,
  // but we need to satisfy all possible cases
  if (!entitlement.feature?.name) {
    return null;
  }

  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $flexWrap="wrap"
      $gap="1rem"
    >
      {title && <Text display={fontStyle}>{title}</Text>}

      <Flex $alignItems="center" $gap="0.5rem">
        {description.length > 0 && (
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
        )}

        {tooltip}

        {cost && <Text>{cost}</Text>}
      </Flex>
    </Flex>
  );
};
