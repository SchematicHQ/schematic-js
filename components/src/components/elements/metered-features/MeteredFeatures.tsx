import { forwardRef, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE } from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { ElementProps, RecursivePartial } from "../../../types";
import {
  darken,
  formatCurrency,
  formatNumber,
  getBillingPrice,
  getFeatureName,
  isCheckoutData,
  lighten,
  shortenPeriod,
  toPrettyDate,
} from "../../../utils";
import { Element } from "../../layout";
import {
  Box,
  Button,
  Flex,
  IconRound,
  ProgressBar,
  Text,
  Tooltip,
  progressColorMap,
  type IconNameTypes,
} from "../../ui";

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

function resolveDesignProps(props: RecursivePartial<DesignProps>): DesignProps {
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
    // there is a typescript bug with `RecursivePartial` so we must cast to `string[] | undefined`
    visibleFeatures: props.visibleFeatures as string[] | undefined,
  };
}

export type MeteredFeaturesProps = DesignProps;

export const MeteredFeatures = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const elements = useRef<HTMLElement[]>([]);
  const shouldWrapChildren = useWrapChildren(elements.current);

  const { t } = useTranslation();

  const { data, settings, setCheckoutState } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const { planPeriod, plan, addOns, featureUsage, subscription } =
    useMemo(() => {
      if (isCheckoutData(data)) {
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
          planPeriod: data.company?.plan?.planPeriod,
          plan: data.company?.plan,
          addOns: data.company?.addOns || [],
          featureUsage: (
            orderedFeatureUsage ||
            data.featureUsage?.features ||
            []
          ).filter(
            (usage) =>
              usage.feature?.featureType === "event" ||
              usage.feature?.featureType === "trait",
          ),
          subscription: data.subscription,
        };
      }

      return {
        planPeriod: undefined,
        plan: undefined,
        addOns: [],
        featureUsage: [],
        subscription: undefined,
      };
    }, [props.visibleFeatures, data]);

  // Check if we should render this component at all:
  // * If there are any plans or add-ons, render it, even if the list is empty.
  // * If there are any features, show it (e.g., there could be features available via company overrides
  //  even if the company has no plan or add-ons).
  // * If none of the above, don't render the component.
  const shouldShowFeatures =
    featureUsage.length > 0 || plan || addOns.length > 0 || false;

  if (!shouldShowFeatures) {
    return null;
  }

  return (
    <styles.Container ref={ref} className={className}>
      {featureUsage.map(
        (
          {
            feature,
            priceBehavior,
            usage,
            allocation,
            softLimit,
            metricResetAt,
            monthlyUsageBasedPrice,
            yearlyUsageBasedPrice,
          },
          index,
        ) => {
          const limit = softLimit ?? allocation ?? 0;
          const isOverage =
            priceBehavior === "overage" &&
            typeof softLimit === "number" &&
            typeof usage === "number" &&
            usage > softLimit;

          const billingPrice = getBillingPrice(
            planPeriod === "year"
              ? yearlyUsageBasedPrice
              : monthlyUsageBasedPrice,
          );
          let { price, currency } = billingPrice || {};
          const packageSize = billingPrice?.packageSize ?? 1;

          // Overage price must be derived from the subscription object
          if (priceBehavior === "overage") {
            const productId = (yearlyUsageBasedPrice ?? monthlyUsageBasedPrice)
              ?.productId;
            if (productId) {
              const products = subscription?.products ?? [];
              const product = products.find((p) => p.id === productId);
              if (product && product.priceTier?.length > 1) {
                // overage price is the last item in the price tier array
                const overagePrice =
                  product.priceTier[product.priceTier.length - 1];
                price = overagePrice.perUnitPriceDecimal
                  ? Number(overagePrice.perUnitPriceDecimal)
                  : (overagePrice.perUnitPrice ?? 0);
                currency = product.currency;
              }
            }
          }

          const progressBar = props.isVisible &&
            typeof usage === "number" &&
            limit > 0 &&
            priceBehavior !== "pay_as_you_go" && (
              <ProgressBar
                progress={(isOverage ? softLimit / usage : usage / limit) * 100}
                value={usage}
                total={isOverage ? softLimit : limit}
                color={
                  isOverage
                    ? "blue"
                    : progressColorMap[
                        Math.floor(
                          (Math.min(usage, limit) / limit) *
                            (progressColorMap.length - 1),
                        )
                      ]
                }
                {...(isOverage && { bgColor: "#2563EB80" })}
              />
            );

          return (
            <Element
              key={index}
              as={Flex}
              $flexDirection="column"
              $gap="1.5rem"
            >
              <Flex $gap="1.5rem">
                {props.icon.isVisible && feature?.icon && (
                  <IconRound
                    name={feature.icon as IconNameTypes | string}
                    size="sm"
                    colors={[
                      settings.theme.primary,
                      isLightBackground
                        ? "hsla(0, 0%, 0%, 0.0625)"
                        : "hsla(0, 0%, 100%, 0.25)",
                    ]}
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
                    {feature?.name && (
                      <Flex $flexDirection="column" $gap="0.5rem" $flexGrow={1}>
                        <Box>
                          <Text display={props.header.fontStyle}>
                            {priceBehavior === "pay_as_you_go"
                              ? typeof usage === "number" && (
                                  <>
                                    {formatNumber(usage)}{" "}
                                    {getFeatureName(feature, usage)}
                                  </>
                                )
                              : feature.name}
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
                    )}

                    {(feature?.featureType === "event" ||
                      feature?.featureType === "trait") &&
                      feature?.name && (
                        <Box
                          $flexBasis="min-content"
                          $flexGrow={1}
                          $textAlign={shouldWrapChildren ? "left" : "right"}
                        >
                          {props.usage.isVisible && (
                            <Box $whiteSpace="nowrap">
                              <Text display={props.usage.fontStyle}>
                                {priceBehavior === "pay_in_advance"
                                  ? typeof allocation === "number" && (
                                      <>
                                        {formatNumber(allocation)}{" "}
                                        {getFeatureName(feature, allocation)}
                                      </>
                                    )
                                  : priceBehavior === "pay_as_you_go"
                                    ? typeof price === "number" &&
                                      typeof usage === "number" &&
                                      formatCurrency(usage * price, currency)
                                    : typeof usage === "number" && (
                                        <>
                                          {formatNumber(usage)}{" "}
                                          {getFeatureName(feature, usage)}
                                          {priceBehavior === "overage" && (
                                            <> {t("used")}</>
                                          )}
                                        </>
                                      )}
                              </Text>
                            </Box>
                          )}

                          {props.allocation.isVisible && (
                            <Box $whiteSpace="nowrap">
                              <Text
                                display={props.allocation.fontStyle}
                                $leading={1.35}
                              >
                                {priceBehavior &&
                                priceBehavior !== "overage" &&
                                metricResetAt
                                  ? t("Resets", {
                                      date: toPrettyDate(metricResetAt, {
                                        month: "short",
                                        day: "numeric",
                                        year: undefined,
                                      }),
                                    })
                                  : priceBehavior === "overage"
                                    ? t("X included", {
                                        amount: formatNumber(limit),
                                      })
                                    : typeof allocation === "number"
                                      ? t("Limit of", {
                                          amount: formatNumber(limit),
                                        })
                                      : t("No limit")}
                              </Text>
                            </Box>
                          )}
                        </Box>
                      )}
                  </Flex>

                  {props.isVisible &&
                    typeof usage === "number" &&
                    priceBehavior !== "pay_as_you_go" && (
                      <Flex $flexWrap="wrap" $justifyContent="end" $gap="2rem">
                        {typeof allocation === "number" && progressBar ? (
                          <Tooltip
                            trigger={progressBar}
                            content={
                              <Text
                                $size={
                                  0.875 *
                                  settings.theme.typography.text.fontSize
                                }
                                $leading={1}
                              >
                                {t("Up to a limit of", {
                                  amount: formatNumber(allocation),
                                  units:
                                    feature?.name && getFeatureName(feature),
                                })}
                              </Text>
                            }
                            $flexGrow={1}
                          />
                        ) : (
                          progressBar
                        )}

                        {priceBehavior === "pay_in_advance" && (
                          <Button
                            onClick={() => {
                              setCheckoutState({ usage: true });
                            }}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            {t("Add More")}
                          </Button>
                        )}
                      </Flex>
                    )}
                </Flex>
              </Flex>

              {priceBehavior === "overage" && typeof price === "number" && (
                <Flex
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                  $margin={`0 -${settings.theme.card.padding / TEXT_BASE_SIZE}rem -${(settings.theme.card.padding * 0.75) / TEXT_BASE_SIZE}rem`}
                  $padding={`${(0.4375 * settings.theme.card.padding) / TEXT_BASE_SIZE}rem ${settings.theme.card.padding / TEXT_BASE_SIZE}rem`}
                  $backgroundColor={
                    isLightBackground
                      ? darken(settings.theme.card.background, 0.05)
                      : lighten(settings.theme.card.background, 0.1)
                  }
                  {...(settings.theme.sectionLayout === "separate" && {
                    $borderBottomLeftRadius: `${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`,
                    $borderBottomRightRadius: `${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`,
                  })}
                >
                  <Text $leading={1.35}>
                    <>
                      {t("Additional")}: {formatCurrency(price, currency)}
                      {feature && (
                        <Box as="sub" $whiteSpace="nowrap">
                          /{packageSize > 1 && <>{packageSize} </>}
                          {getFeatureName(feature, packageSize)}
                          {feature.featureType === "trait" && planPeriod && (
                            <>/{shortenPeriod(planPeriod)}</>
                          )}
                        </Box>
                      )}
                    </>
                  </Text>

                  {isOverage && (
                    <Text $leading={1.35}>
                      {formatNumber(usage - softLimit)}{" "}
                      {feature && getFeatureName(feature)}
                      {" · "}
                      {formatCurrency(price * (usage - softLimit), currency)}
                      {feature?.featureType === "trait" &&
                        typeof planPeriod === "string" && (
                          <Box as="sub" $whiteSpace="nowrap">
                            /{shortenPeriod(planPeriod)}
                          </Box>
                        )}
                    </Text>
                  )}
                </Flex>
              )}
            </Element>
          );
        },
      )}
    </styles.Container>
  );
});

MeteredFeatures.displayName = "MeteredFeatures";
