import { forwardRef, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

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
  lighten,
  shortenPeriod,
  toPrettyDate,
} from "../../../utils";
import { Element } from "../../layout";
import {
  Box,
  EmbedButton,
  Flex,
  type IconNameTypes,
  IconRound,
  ProgressBar,
  progressColorMap,
  Text,
  Tooltip,
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

  const theme = useTheme();

  const { data, setLayout, setSelected } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const featureUsage = useMemo(() => {
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

    return (orderedFeatureUsage || data.featureUsage?.features || []).filter(
      (usage) =>
        usage.feature?.featureType === "event" ||
        usage.feature?.featureType === "trait",
    );
  }, [props.visibleFeatures, data.featureUsage?.features]);

  const planPeriod = data.company?.plan?.planPeriod;

  // Check if we should render this component at all:
  // * If there are any plans or add-ons, render it, even if the list is empty.
  // * If there are any features, show it (e.g., there could be features available via company overrides
  //  even if the company has no plan or add-ons).
  // * If none of the above, don't render the component.
  const shouldShowFeatures =
    featureUsage.length > 0 ||
    data.company?.plan ||
    (data.company?.addOns ?? []).length > 0 ||
    false;

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

          let { price, currency } =
            getBillingPrice(
              planPeriod === "year"
                ? yearlyUsageBasedPrice
                : monthlyUsageBasedPrice,
            ) || {};

          // Overage price must be derived from the subscription object
          if (priceBehavior === "overage") {
            const productId = (yearlyUsageBasedPrice ?? monthlyUsageBasedPrice)
              ?.productId;
            if (productId) {
              const products = data?.subscription?.products ?? [];
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
                      theme.primary,
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
                        <Text
                          as={Box}
                          $font={
                            theme.typography[props.header.fontStyle].fontFamily
                          }
                          $size={
                            theme.typography[props.header.fontStyle].fontSize
                          }
                          $weight={
                            theme.typography[props.header.fontStyle].fontWeight
                          }
                          $color={
                            theme.typography[props.header.fontStyle].color
                          }
                          $leading={1.35}
                        >
                          {priceBehavior === "pay_as_you_go"
                            ? typeof usage === "number" && (
                                <>
                                  {formatNumber(usage)}{" "}
                                  {getFeatureName(feature, usage)}
                                </>
                              )
                            : feature.name}
                        </Text>

                        {props.description.isVisible && (
                          <Text
                            as={Box}
                            $font={
                              theme.typography[props.description.fontStyle]
                                .fontFamily
                            }
                            $size={
                              theme.typography[props.description.fontStyle]
                                .fontSize
                            }
                            $weight={
                              theme.typography[props.description.fontStyle]
                                .fontWeight
                            }
                            $color={
                              theme.typography[props.description.fontStyle]
                                .color
                            }
                          >
                            {feature.description}
                          </Text>
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
                            <Text
                              as={Box}
                              $font={
                                theme.typography[props.usage.fontStyle]
                                  .fontFamily
                              }
                              $size={
                                theme.typography[props.usage.fontStyle].fontSize
                              }
                              $weight={
                                theme.typography[props.usage.fontStyle]
                                  .fontWeight
                              }
                              $color={
                                theme.typography[props.usage.fontStyle].color
                              }
                              $leading={1.35}
                              style={{
                                whiteSpace: "nowrap",
                              }}
                            >
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
                          )}

                          {props.allocation.isVisible &&
                            priceBehavior !== "overage" && (
                              <Box $whiteSpace="nowrap">
                                <Text
                                  $font={
                                    theme.typography[props.allocation.fontStyle]
                                      .fontFamily
                                  }
                                  $size={
                                    theme.typography[props.allocation.fontStyle]
                                      .fontSize
                                  }
                                  $weight={
                                    theme.typography[props.allocation.fontStyle]
                                      .fontWeight
                                  }
                                  $color={
                                    theme.typography[props.allocation.fontStyle]
                                      .color
                                  }
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
                                    : typeof allocation === "number" ||
                                        typeof softLimit === "number"
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
                        {typeof allocation === "number" ? (
                          <Tooltip
                            trigger={progressBar}
                            content={
                              <Text
                                $font={theme.typography.text.fontFamily}
                                $size={0.875 * theme.typography.text.fontSize}
                                $weight={theme.typography.text.fontWeight}
                                $color={theme.typography.text.color}
                                $leading={1}
                              >
                                {t("Up to a limit of", {
                                  amount: allocation,
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
                          <EmbedButton
                            onClick={() => {
                              setSelected({ usage: true });
                              setLayout("checkout");
                            }}
                            $fullWidth={false}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            {t("Add More")}
                          </EmbedButton>
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
                  $margin={`0 -${theme.card.padding / TEXT_BASE_SIZE}rem -${(theme.card.padding * 0.75) / TEXT_BASE_SIZE}rem`}
                  $padding={`${(0.4375 * theme.card.padding) / TEXT_BASE_SIZE}rem ${theme.card.padding / TEXT_BASE_SIZE}rem`}
                  $backgroundColor={
                    isLightBackground
                      ? darken(theme.card.background, 0.05)
                      : lighten(theme.card.background, 0.1)
                  }
                  {...(theme.sectionLayout === "separate" && {
                    $borderBottomLeftRadius: `${theme.card.borderRadius / TEXT_BASE_SIZE}rem`,
                    $borderBottomRightRadius: `${theme.card.borderRadius / TEXT_BASE_SIZE}rem`,
                  })}
                >
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                    $leading={1.35}
                  >
                    <>
                      {t("Overage fee")}: {formatCurrency(price, currency)}
                      {feature && (
                        <Box as="sub" $whiteSpace="nowrap">
                          /{getFeatureName(feature, 1)}
                          {feature.featureType === "trait" && planPeriod && (
                            <>/{shortenPeriod(planPeriod)}</>
                          )}
                        </Box>
                      )}
                    </>
                  </Text>

                  {isOverage && (
                    <Text
                      $font={theme.typography.text.fontFamily}
                      $size={theme.typography.text.fontSize}
                      $weight={theme.typography.text.fontWeight}
                      $color={theme.typography.text.color}
                      $leading={1.35}
                    >
                      {t("X over the limit", {
                        amount: usage - softLimit,
                      })}
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
