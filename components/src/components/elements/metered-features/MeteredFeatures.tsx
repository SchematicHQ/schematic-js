import { forwardRef, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import { type FeatureUsageResponseData } from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import {
  darken,
  lighten,
  formatCurrency,
  formatNumber,
  shortenPeriod,
  toPrettyDate,
} from "../../../utils";
import { Element } from "../../layout";
import {
  progressColorMap,
  Box,
  Flex,
  IconRound,
  ProgressBar,
  Text,
  type IconNameTypes,
  EmbedButton,
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

  const { planPeriod } = data.company?.plan || {};

  const featureUsage = (
    props.visibleFeatures
      ? props.visibleFeatures.reduce(
          (
            acc: (FeatureUsageResponseData & {
              // TODO: remove once api is updated
              softLimit?: number;
            })[],
            id,
          ) => {
            const mappedFeatureUsage = data.featureUsage?.features.find(
              (usage) => usage.feature?.id === id,
            );

            if (mappedFeatureUsage) {
              // TODO: for testing, remove later
              if (mappedFeatureUsage.feature?.name === "Search") {
                acc.push({
                  ...mappedFeatureUsage,
                  priceBehavior: "overage",
                  softLimit: 1,
                });
              } else {
                acc.push(mappedFeatureUsage);
              }
            }

            return acc;
          },
          [],
        )
      : data.featureUsage?.features.map(
          (
            usage: FeatureUsageResponseData & {
              // TODO: remove once api is updated
              softLimit?: number;
            },
          ) => {
            // TODO: for testing, remove later
            return usage.feature?.name === "Search"
              ? {
                  ...usage,
                  priceBehavior: "overage",
                  softLimit: 1,
                }
              : usage;
          },
        ) || []
  ).filter(
    (usage) =>
      usage.feature?.featureType === "event" ||
      usage.feature?.featureType === "trait",
  );

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
            allocation,
            feature,
            usage,
            softLimit,
            priceBehavior,
            metricResetAt,
            monthlyUsageBasedPrice,
            yearlyUsageBasedPrice,
          },
          index,
        ) => {
          let price: number | undefined;
          let currency: string | undefined;
          if (planPeriod === "month") {
            price = monthlyUsageBasedPrice?.price;
            currency = monthlyUsageBasedPrice?.currency;
          } else if (planPeriod === "year") {
            price = yearlyUsageBasedPrice?.price;
            currency = yearlyUsageBasedPrice?.currency;
          }

          const limit = allocation || softLimit || 0;

          return (
            <Flex key={index} $flexDirection="column-reverse">
              {priceBehavior === "overage" && typeof price === "number" && (
                <Flex
                  $justifyContent="space-between"
                  $alignItems="center"
                  $padding={`${(0.4375 * theme.card.padding) / TEXT_BASE_SIZE}rem ${theme.card.padding / TEXT_BASE_SIZE}rem`}
                  $backgroundColor={
                    isLightBackground
                      ? darken(theme.card.background, 0.05)
                      : lighten(theme.card.background, 0.1)
                  }
                >
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    <>
                      {t("Overage fee")}: {formatCurrency(price, currency)}
                      {feature && (
                        <sub>
                          /{pluralize(feature.name.toLowerCase(), 1)}
                          {feature.featureType === "event" &&
                            data.company?.plan?.planPeriod && (
                              <>
                                /{shortenPeriod(data.company.plan.planPeriod)}
                              </>
                            )}
                        </sub>
                      )}
                    </>
                  </Text>

                  {typeof usage === "number" &&
                    typeof softLimit === "number" &&
                    usage > softLimit && (
                      <Text
                        $font={theme.typography.text.fontFamily}
                        $size={theme.typography.text.fontSize}
                        $weight={theme.typography.text.fontWeight}
                        $color={theme.typography.text.color}
                      >
                        {t("X over the limit", {
                          amount: usage - softLimit,
                        })}
                        {" · "}
                        {formatCurrency(price * (usage - softLimit), currency)}
                        {feature?.featureType === "event" &&
                          typeof data.company?.plan?.planPeriod === "string" &&
                          `/${shortenPeriod(data.company.plan.planPeriod)}`}
                      </Text>
                    )}
                </Flex>
              )}

              <Element as={Flex} $gap="1.5rem">
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

                <Flex $flexDirection="column" $gap="2rem" $flexGrow="1">
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
                      <Flex $flexDirection="column" $gap="0.5rem" $flexGrow="1">
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
                        >
                          {priceBehavior === "pay_as_you_go"
                            ? typeof usage === "number" && (
                                <>
                                  {formatNumber(usage)}{" "}
                                  {pluralize(feature.name, usage)}
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
                          $flexGrow="1"
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
                              $leading={1.35}
                              $color={
                                theme.typography[props.usage.fontStyle].color
                              }
                            >
                              {priceBehavior === "pay_in_advance"
                                ? typeof allocation === "number" && (
                                    <>
                                      {formatNumber(allocation)}{" "}
                                      {pluralize(feature.name, allocation)}
                                    </>
                                  )
                                : priceBehavior === "pay_as_you_go"
                                  ? typeof price === "number" &&
                                    typeof usage === "number" &&
                                    formatCurrency(usage * price, currency)
                                  : typeof usage === "number" && (
                                      <>
                                        {formatNumber(usage)}{" "}
                                        {pluralize(feature.name, usage)}
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
                      <Flex $gap="2rem">
                        <ProgressBar
                          progress={
                            (priceBehavior === "overage" &&
                            typeof softLimit === "number" &&
                            usage > softLimit
                              ? softLimit / usage
                              : usage / limit) * 100
                          }
                          value={usage}
                          total={
                            priceBehavior === "overage" &&
                            typeof softLimit === "number" &&
                            usage > softLimit
                              ? softLimit
                              : limit
                          }
                          color={
                            progressColorMap[
                              Math.floor(
                                priceBehavior === "overage" &&
                                  typeof softLimit === "number" &&
                                  usage > softLimit
                                  ? (softLimit / usage) *
                                      (progressColorMap.length - 1)
                                  : (Math.min(usage, limit) / limit) *
                                      (progressColorMap.length - 1),
                              )
                            ]
                          }
                          {...(priceBehavior === "overage" &&
                            typeof softLimit === "number" &&
                            usage > softLimit && { bgColor: "#EF4444" })}
                          $flexGrow="1"
                        />

                        {priceBehavior === "pay_in_advance" && (
                          <EmbedButton
                            onClick={() => {
                              setSelected({ usage: true });
                              setLayout("checkout");
                            }}
                            style={{
                              width: "fit-content",
                              padding: "0 1rem 0 0.5rem",
                            }}
                          >
                            {t("Add More")}
                          </EmbedButton>
                        )}
                      </Flex>
                    )}
                </Flex>
              </Element>
            </Flex>
          );
        },
      )}
    </styles.Container>
  );
});

MeteredFeatures.displayName = "MeteredFeatures";
