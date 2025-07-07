import { forwardRef, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import {
  formatNumber,
  getFeatureName,
  getUsageDetails,
  isCheckoutData,
  toPrettyDate,
} from "../../../utils";
import { Element } from "../../layout";
import { Box, Button, Flex, Icon, Text } from "../../ui";

import { Meter } from "./Meter";
import { PriceDetails } from "./PriceDetails";
import * as styles from "./styles";

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

  const { meteredFeatures, period } = useMemo(() => {
    if (isCheckoutData(data)) {
      const period =
        typeof data.company?.plan?.planPeriod === "string"
          ? data.company?.plan?.planPeriod
          : undefined;
      const orderedFeatureUsage = props.visibleFeatures?.reduce(
        (acc: FeatureUsageResponseData[], id) => {
          const mappedFeatureUsage = data.featureUsage?.features.find(
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
        meteredFeatures: (
          orderedFeatureUsage ||
          data.featureUsage?.features ||
          []
        ).filter(
          ({ feature }) =>
            feature?.featureType === "event" ||
            feature?.featureType === "trait",
        ),
        period,
      };
    }

    return {
      meteredFeatures: [],
      period: undefined,
    };
  }, [props.visibleFeatures, data]);

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

        const { feature, priceBehavior, usage, metricResetAt } = entitlement;
        const { billingPrice, limit, amount, currentTier } = getUsageDetails(
          entitlement,
          period,
        );

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
                          {priceBehavior === "pay_in_advance" ? (
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

                    {
                      // TODO: finish
                      props.allocation.isVisible && (
                        <Box $whiteSpace="nowrap">
                          <Text display={props.allocation.fontStyle}>
                            {priceBehavior === "tier" ? (
                              <>{/* TODO: implement */}</>
                            ) : priceBehavior === "overage" &&
                              typeof limit === "number" ? (
                              t("X included", {
                                amount: formatNumber(limit),
                              })
                            ) : typeof limit === "number" ? (
                              t("Limit of", {
                                amount: formatNumber(limit),
                              })
                            ) : (
                              t("No limit")
                            )}
                            {" • "}
                            {metricResetAt &&
                              t("Resets", {
                                date: toPrettyDate(metricResetAt, {
                                  month: "short",
                                  day: "numeric",
                                  year: undefined,
                                }),
                              })}
                          </Text>
                        </Box>
                      )
                    }
                  </Box>
                </Flex>

                {props.isVisible && priceBehavior !== "pay_as_you_go" && (
                  <Meter entitlement={entitlement} period={period} />
                )}

                {priceBehavior === "pay_in_advance" && (
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

            {(priceBehavior === "overage" || priceBehavior === "tier") && (
              <PriceDetails
                period={period}
                feature={feature}
                priceBehavior={priceBehavior}
                amount={amount}
                billingPrice={billingPrice}
                currentTier={currentTier}
              />
            )}
          </Element>,
        );

        return acc;
      }, [])}
    </styles.Container>
  );
});

MeteredFeatures.displayName = "MeteredFeatures";
