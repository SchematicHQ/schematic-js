import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import {
  CreditGrantReason,
  FeatureType,
  PriceBehavior,
  TEXT_BASE_SIZE,
} from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import {
  formatCurrency,
  formatNumber,
  getFeatureName,
  getUsageDetails,
  groupCreditGrants,
  modifyDate,
  toPrettyDate,
  type UsageDetails,
} from "../../../utils";
import { Element } from "../../layout";
import {
  Box,
  Button,
  Flex,
  Icon,
  ProgressBar,
  Text,
  TransitionBox,
  progressColorMap,
} from "../../ui";

import { Meter } from "./Meter";
import { PriceDetails } from "./PriceDetails";
import * as styles from "./styles";

interface LimitProps {
  entitlement: FeatureUsageResponseData;
  usageDetails: UsageDetails;
  fontStyle?: FontStyle;
}

const Limit = ({ entitlement, usageDetails, fontStyle }: LimitProps) => {
  const { t } = useTranslation();

  const { feature, priceBehavior, allocation, usage, metricResetAt } =
    entitlement;
  const { billingPrice, limit, cost, currentTier } = usageDetails;

  const acc: React.ReactNode[] = [];

  acc.push(
    priceBehavior === PriceBehavior.Tiered &&
      typeof currentTier?.to === "number" &&
      typeof feature?.name === "string"
      ? currentTier?.to === Infinity
        ? t("Unlimited in this tier", {
            feature: getFeatureName(feature),
          })
        : t("Up to X units in this tier", {
            amount: currentTier.to,
            feature: getFeatureName(feature),
          })
      : priceBehavior === PriceBehavior.Overage && typeof limit === "number"
        ? t("X included", {
            amount: formatNumber(limit),
          })
        : priceBehavior === PriceBehavior.PayInAdvance &&
            typeof usage === "number"
          ? `${formatNumber(usage)} ${t("used")}`
          : priceBehavior === PriceBehavior.PayAsYouGo &&
              typeof cost === "number"
            ? formatCurrency(cost, billingPrice?.currency)
            : typeof allocation === "number"
              ? t("Limit of", {
                  amount: formatNumber(allocation),
                })
              : t("No limit"),
  );

  if (metricResetAt) {
    acc.push(
      t("Resets", {
        date: toPrettyDate(metricResetAt, {
          month: "numeric",
          day: "numeric",
          year: undefined,
        }),
      }),
    );
  }

  return (
    <Box $whiteSpace="nowrap">
      <Text display={fontStyle}>{acc.join(" • ")}</Text>
    </Box>
  );
};

interface DesignProps {
  isVisible: boolean;
  header: {
    fontStyle: FontStyle;
  };
  description: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  icon: {
    isVisible: boolean;
  };
  allocation: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  usage: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  visibleFeatures?: string[];
}

function resolveDesignProps(props: DeepPartial<DesignProps>): DesignProps {
  return {
    isVisible: props.isVisible ?? true,
    header: {
      fontStyle: props.header?.fontStyle ?? "heading2",
    },
    description: {
      isVisible: props.description?.isVisible ?? true,
      fontStyle: props.description?.fontStyle ?? "text",
    },
    icon: {
      isVisible: props.icon?.isVisible ?? true,
    },
    allocation: {
      isVisible: props.allocation?.isVisible ?? true,
      fontStyle: props.allocation?.fontStyle ?? "heading4",
    },
    usage: {
      isVisible: props.usage?.isVisible ?? true,
      fontStyle: props.usage?.fontStyle ?? "heading5",
    },
    // there is a typescript bug with `DeepPartial` so we must cast to `string[] | undefined`
    visibleFeatures: props.visibleFeatures as string[] | undefined,
  };
}

export type MeteredFeaturesProps = DesignProps;

export const MeteredFeatures = forwardRef<
  HTMLDivElement | null,
  ElementProps & DeepPartial<DesignProps> & React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const elements = useRef<HTMLElement[]>([]);
  const shouldWrapChildren = useWrapChildren(elements.current);

  const { t } = useTranslation();

  const { data, settings, setCheckoutState } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const { period, meteredFeatures, creditGroups } = useMemo(() => {
    const period = data?.company?.plan?.planPeriod || undefined;
    const orderedFeatureUsage = props.visibleFeatures?.reduce(
      (acc: FeatureUsageResponseData[], id) => {
        const mappedFeatureUsage = data?.featureUsage?.features.find(
          (usage) => usage.feature?.id === id,
        );

        if (mappedFeatureUsage) {
          acc.push(mappedFeatureUsage);
        }

        return acc;
      },
      [],
    );

    return {
      period,
      meteredFeatures: (
        orderedFeatureUsage ||
        data?.featureUsage?.features ||
        []
      ).filter(
        ({ priceBehavior, feature }) =>
          // credit-based entitlements behave differently and should not be shown as a metered feature
          priceBehavior !== PriceBehavior.Credit &&
          (feature?.featureType === FeatureType.Event ||
            feature?.featureType === FeatureType.Trait),
      ),
      creditGroups: groupCreditGrants(data?.creditGrants || [], {
        groupBy: "credit",
      }),
    };
  }, [
    props.visibleFeatures,
    data?.company?.plan?.planPeriod,
    data?.featureUsage?.features,
    data?.creditGrants,
  ]);

  const [creditVisibility, setCreditVisibility] = useState(
    creditGroups.map(({ id }) => ({ id, isExpanded: false })),
  );

  const toggleBalanceDetails = useCallback((id: string) => {
    setCreditVisibility((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isExpanded: !item.isExpanded } : item,
      ),
    );
  }, []);

  const shouldShowFeatures = meteredFeatures.length > 0;
  if (!shouldShowFeatures) {
    return null;
  }

  return (
    <styles.Container ref={ref} className={className}>
      {meteredFeatures.reduce((acc: React.ReactNode[], entitlement, index) => {
        if (!entitlement.feature) {
          return acc;
        }

        const { feature, priceBehavior, usage } = entitlement;
        const usageDetails = getUsageDetails(entitlement, period);
        const { limit } = usageDetails;

        acc.push(
          <Element key={index} as={Flex} $flexDirection="column" $gap="1.5rem">
            <Flex $gap="1.5rem">
              {props.icon.isVisible && (
                <Icon
                  name={feature.icon}
                  color={settings.theme.primary}
                  background={
                    isLightBackground
                      ? "hsla(0, 0%, 0%, 0.0625)"
                      : "hsla(0, 0%, 100%, 0.25)"
                  }
                  rounded
                />
              )}

              <Flex $flexDirection="column" $gap="2rem" $flexGrow={1}>
                <Flex
                  ref={(el) => {
                    if (el) {
                      elements.current.push(el);
                    }
                  }}
                  $flexWrap="wrap"
                  $gap="1rem"
                >
                  <Flex $flexDirection="column" $gap="0.5rem" $flexGrow={1}>
                    <Box>
                      <Text display={props.header.fontStyle}>
                        {feature.name}
                      </Text>
                    </Box>

                    {props.description.isVisible && (
                      <Box>
                        <Text display={props.description.fontStyle}>
                          {feature.description}
                        </Text>
                      </Box>
                    )}
                  </Flex>

                  <Box
                    $flexBasis="min-content"
                    $flexGrow={1}
                    $textAlign={shouldWrapChildren ? "left" : "right"}
                  >
                    {props.usage.isVisible && (
                      <Box $whiteSpace="nowrap">
                        <Text display={props.usage.fontStyle}>
                          {priceBehavior === PriceBehavior.PayInAdvance ? (
                            <>
                              {typeof limit === "number" && (
                                <>{formatNumber(limit)} </>
                              )}
                              {getFeatureName(feature, limit)}
                            </>
                          ) : (
                            typeof usage === "number" && (
                              <>
                                {formatNumber(usage)}{" "}
                                {getFeatureName(feature, usage)} {t("used")}
                              </>
                            )
                          )}
                        </Text>
                      </Box>
                    )}

                    {props.allocation.isVisible && (
                      <Limit
                        entitlement={entitlement}
                        usageDetails={usageDetails}
                        fontStyle={props.allocation.fontStyle}
                      />
                    )}
                  </Box>
                </Flex>

                {props.isVisible &&
                  priceBehavior !== PriceBehavior.PayAsYouGo && (
                    <Meter
                      entitlement={entitlement}
                      usageDetails={usageDetails}
                    />
                  )}

                {priceBehavior === PriceBehavior.PayInAdvance && (
                  <Button
                    type="button"
                    onClick={() => {
                      setCheckoutState({ usage: true });
                    }}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {t("Add More")}
                  </Button>
                )}
              </Flex>
            </Flex>

            {(priceBehavior === PriceBehavior.Overage ||
              priceBehavior === PriceBehavior.Tiered) && (
              <PriceDetails
                entitlement={entitlement}
                usageDetails={usageDetails}
                period={period}
              />
            )}
          </Element>,
        );

        return acc;
      }, [])}

      {creditGroups.map((credit, index) => {
        const isExpanded =
          creditVisibility.find(({ id }) => credit.id === id)?.isExpanded ??
          false;

        return (
          <Element key={index} as={Flex} $flexDirection="column" $gap="1rem">
            <Flex $gap="1.5rem">
              {props.icon.isVisible && (
                <Icon
                  // if `icon` is `undefined` this will render as a blank circle
                  name={credit.icon as string}
                  color={settings.theme.primary}
                  background={
                    isLightBackground
                      ? "hsla(0, 0%, 0%, 0.0625)"
                      : "hsla(0, 0%, 100%, 0.25)"
                  }
                  rounded
                />
              )}

              <Flex $flexDirection="column" $gap="2rem" $flexGrow={1}>
                <Flex $flexWrap="wrap" $gap="1rem">
                  <Flex $flexDirection="column" $gap="0.5rem" $flexGrow={1}>
                    <Box>
                      <Text display={props.header.fontStyle}>
                        {credit.name}
                      </Text>
                    </Box>

                    {props.description.isVisible && (
                      <Box>
                        <Text display={props.description.fontStyle}>
                          {credit.description}
                        </Text>
                      </Box>
                    )}
                  </Flex>
                </Flex>

                <Flex $gap="1rem">
                  <ProgressBar
                    progress={(credit.total.used / credit.total.value) * 100}
                    value={credit.total.used}
                    total={credit.total.value}
                    color={
                      progressColorMap[
                        Math.floor(
                          (credit.total.used / credit.total.value) *
                            (progressColorMap.length - 1),
                        )
                      ]
                    }
                  />

                  <Button
                    type="button"
                    onClick={() => {
                      setCheckoutState({ credits: true });
                    }}
                    style={{ whiteSpace: "nowrap" }}
                    $size="sm"
                  >
                    {t("Buy More")}
                  </Button>
                </Flex>
              </Flex>
            </Flex>

            <Box
              $width={`calc(100% + ${(2 * settings.theme.card.padding) / TEXT_BASE_SIZE}rem)`}
              $margin={`0 0 0 -${settings.theme.card.padding / TEXT_BASE_SIZE}rem`}
            >
              <TransitionBox
                $backgroundColor={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.0375)"
                    : "hsla(0, 0%, 100%, 0.075)"
                }
                $isExpanded={isExpanded}
              >
                {credit.grants.map((grant, index) => {
                  const paddingX = settings.theme.card.padding / TEXT_BASE_SIZE;
                  const padding =
                    index > 0 ? `0 ${paddingX}rem 1rem` : `1rem ${paddingX}rem`;

                  return (
                    <Box key={grant.id} $display="table-row">
                      {grant.grantReason === CreditGrantReason.Plan ? (
                        <>
                          <Box $display="table-cell" $padding={padding}>
                            <Text>
                              {t("X items included in plan", {
                                amount: grant.quantity,
                                item: getFeatureName(credit, grant.quantity),
                              })}
                            </Text>
                          </Box>

                          <Box
                            $display="table-cell"
                            $padding={padding}
                            $textAlign="right"
                            $whiteSpace="nowrap"
                          >
                            {grant.expiresAt && (
                              <Text>
                                {t("Resets", {
                                  date: toPrettyDate(
                                    modifyDate(grant.expiresAt, 1),
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "2-digit",
                                    },
                                  ),
                                })}
                              </Text>
                            )}
                          </Box>
                        </>
                      ) : (
                        <>
                          <Box $display="table-cell" $padding={padding}>
                            <Text>
                              {grant.grantReason ===
                              CreditGrantReason.Purchased ? (
                                <>
                                  {t("X item bundle", {
                                    amount: grant.quantity,
                                    item: getFeatureName(credit, 1),
                                    createdAt: toPrettyDate(grant.createdAt, {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "2-digit",
                                    }),
                                  })}
                                </>
                              ) : (
                                <>
                                  {t("X item grant", {
                                    amount: grant.quantity,
                                    item: getFeatureName(
                                      credit,
                                      grant.quantity,
                                    ),
                                    createdAt: toPrettyDate(grant.createdAt, {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "2-digit",
                                    }),
                                  })}
                                </>
                              )}
                            </Text>
                          </Box>

                          <Box
                            $display="table-cell"
                            $padding={padding}
                            $textAlign="right"
                            $whiteSpace="nowrap"
                          >
                            {grant.expiresAt && (
                              <Text>
                                {t("Expires", {
                                  date: toPrettyDate(
                                    modifyDate(grant.expiresAt, 1),
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "2-digit",
                                    },
                                  ),
                                })}
                              </Text>
                            )}
                          </Box>
                        </>
                      )}
                    </Box>
                  );
                })}
              </TransitionBox>
            </Box>

            <Flex $gap="0.25rem">
              <Icon
                name="chevron-down"
                color={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.8)"
                    : "hsla(0, 0%, 100%, 0.4)"
                }
                style={{
                  marginLeft: `-${1 / 3}rem`,
                  ...(isExpanded && { transform: "rotate(180deg)" }),
                }}
              />
              <Text
                onClick={() => toggleBalanceDetails(credit.id)}
                display="link"
              >
                {isExpanded
                  ? t("Hide balance details")
                  : t("See balance details")}
              </Text>
            </Flex>
          </Element>
        );
      })}
    </styles.Container>
  );
});

MeteredFeatures.displayName = "MeteredFeatures";
