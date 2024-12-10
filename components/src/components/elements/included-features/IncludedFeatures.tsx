import { forwardRef, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import type {
  FeatureUsageResponseData,
  PlanEntitlementResponseData,
  UsageBasedEntitlementResponseData,
} from "../../../api";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { formatCurrency, formatNumber, shortenPeriod } from "../../../utils";
import { Element } from "../../layout";
import { Box, Flex, Icon, IconRound, Text, type IconNameTypes } from "../../ui";

interface DesignProps {
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
    text: string;
  };
  icons: {
    isVisible: boolean;
    fontStyle: FontStyle;
    style: "light" | "dark";
  };
  entitlement: {
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
    header: {
      isVisible: props.header?.isVisible ?? true,
      fontStyle: props.header?.fontStyle ?? "heading4",
      text: props.header?.text ?? "Included features",
    },
    icons: {
      isVisible: props.icons?.isVisible ?? true,
      fontStyle: props.icons?.fontStyle ?? "heading5",
      style: props.icons?.style ?? "light",
    },
    entitlement: {
      isVisible: props.entitlement?.isVisible ?? true,
      fontStyle: props.entitlement?.fontStyle ?? "text",
    },
    usage: {
      isVisible: props.usage?.isVisible ?? true,
      fontStyle: props.usage?.fontStyle ?? "heading6",
    },
    // there is a typescript bug with `RecursivePartial` so we must cast to `string[] | undefined`
    visibleFeatures: props.visibleFeatures as string[] | undefined,
  };
}

export type IncludedFeaturesProps = DesignProps;

export const IncludedFeatures = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const visibleCount = 4;
  const [showAll, setShowAll] = useState(visibleCount);
  const [isExpanded, setIsExpanded] = useState(false); // New state

  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const theme = useTheme();

  const { data } = useEmbed();

  const elements = useRef<HTMLElement[]>([]);
  const shouldWrapChildren = useWrapChildren(elements.current);

  const isLightBackground = useIsLightBackground();

  const usageBasedEntitlements = data.activeUsageBasedEntitlements.reduce(
    (
      acc: {
        entitlement: PlanEntitlementResponseData;
        usage: UsageBasedEntitlementResponseData;
      }[],
      usage,
    ) => {
      const entitlement = data.activePlans
        .find((plan) => plan.id === data.company?.plan?.id)
        ?.entitlements.find((entitlement) => {
          return usage.featureId === entitlement.featureId;
        });

      if (entitlement) {
        acc.push({
          entitlement,
          usage,
        });
      }

      return acc;
    },
    [],
  );

  const featureUsage = props.visibleFeatures
    ? props.visibleFeatures.reduce((acc: FeatureUsageResponseData[], id) => {
        const mappedFeatureUsage = data.featureUsage?.features.find(
          (usage) => usage.feature?.id === id,
        );
        if (mappedFeatureUsage) {
          acc.push(mappedFeatureUsage);
        }

        return acc;
      }, [])
    : data.featureUsage?.features || [];

  const totalListSize = usageBasedEntitlements.length + featureUsage.length;

  const handleToggleShowAll = () => {
    if (isExpanded) {
      setShowAll(visibleCount);
    } else {
      setShowAll(totalListSize);
    }
    setIsExpanded(!isExpanded); // Toggle state
  };

  // Check if we should render this component at all:
  // * If there are any plans or addons, render it, even if the list is empty.
  // * If there are any features, show it (e.g., there could be features available via company overrides
  //  even if the company has no plan or add-ons).
  // * If none of the above, don't render the component.
  const shouldShowFeatures =
    totalListSize > 0 ||
    data.company?.plan ||
    (data.company?.addOns ?? []).length > 0 ||
    false;

  if (!shouldShowFeatures) {
    return null;
  }

  return (
    <Element
      as={Flex}
      ref={ref}
      className={className}
      $flexDirection="column"
      $gap="1rem"
    >
      {props.header.isVisible && (
        <Box $marginBottom="0.5rem">
          <Text
            $font={theme.typography[props.header.fontStyle].fontFamily}
            $size={theme.typography[props.header.fontStyle].fontSize}
            $weight={theme.typography[props.header.fontStyle].fontWeight}
            $color={theme.typography[props.header.fontStyle].color}
          >
            {props.header.text}
          </Text>
        </Box>
      )}

      {[
        ...usageBasedEntitlements.map(({ entitlement, usage }, index) => {
          return (
            <Flex
              key={featureUsage.length + index}
              ref={(el) => el && elements.current.push(el)}
              $flexWrap="wrap"
              $justifyContent="space-between"
              $alignItems="center"
              $gap="1rem"
            >
              <Flex $flexGrow="1" $flexBasis="min-content" $gap="1rem">
                {props.icons.isVisible && entitlement.feature?.icon && (
                  <IconRound
                    name={entitlement.feature.icon as IconNameTypes | string}
                    size="sm"
                    colors={[
                      theme.primary,
                      isLightBackground
                        ? "hsla(0, 0%, 0%, 0.0625)"
                        : "hsla(0, 0%, 100%, 0.25)",
                    ]}
                  />
                )}

                {entitlement.feature?.name && (
                  <Flex $alignItems="center">
                    <Text
                      $font={theme.typography[props.icons.fontStyle].fontFamily}
                      $size={theme.typography[props.icons.fontStyle].fontSize}
                      $weight={
                        theme.typography[props.icons.fontStyle].fontWeight
                      }
                      $color={theme.typography[props.icons.fontStyle].color}
                    >
                      {entitlement.feature.name}
                    </Text>
                  </Flex>
                )}
              </Flex>

              {entitlement.feature?.name && (
                <Box
                  $flexBasis="min-content"
                  $flexGrow="1"
                  $textAlign={shouldWrapChildren ? "left" : "right"}
                >
                  {props.entitlement.isVisible && (
                    <Box $whiteSpace="nowrap">
                      <Text
                        $font={
                          theme.typography[props.entitlement.fontStyle]
                            .fontFamily
                        }
                        $size={
                          theme.typography[props.entitlement.fontStyle].fontSize
                        }
                        $weight={
                          theme.typography[props.entitlement.fontStyle]
                            .fontWeight
                        }
                        $leading={1}
                        $color={
                          theme.typography[props.entitlement.fontStyle].color
                        }
                      >
                        {usage.priceBehavior === "pay_in_advance" &&
                          typeof usage.valueNumeric === "number" &&
                          `${formatNumber(usage.valueNumeric)} ${pluralize(
                            entitlement.feature.name,
                            usage.valueNumeric,
                          )}`}

                        {usage.priceBehavior === "pay_as_you_go" &&
                          typeof usage.meteredPrice?.price === "number" &&
                          `${formatCurrency(usage.meteredPrice.price)} ${t("per")} ${pluralize(
                            entitlement.feature.name.toLowerCase(),
                            1,
                          )}`}
                      </Text>
                    </Box>
                  )}

                  {props.usage.isVisible && (
                    <Box $whiteSpace="nowrap">
                      <Text
                        $font={
                          theme.typography[props.usage.fontStyle].fontFamily
                        }
                        $size={theme.typography[props.usage.fontStyle].fontSize}
                        $weight={
                          theme.typography[props.usage.fontStyle].fontWeight
                        }
                        $leading={1}
                        $color={theme.typography[props.usage.fontStyle].color}
                      >
                        {usage.priceBehavior === "pay_in_advance" &&
                          typeof usage.meteredPrice?.interval === "string" &&
                          typeof usage.meteredPrice?.price === "number" &&
                          `${formatCurrency(usage.meteredPrice.price)}/${shortenPeriod(usage.meteredPrice.interval)}/${pluralize(entitlement.feature.name.toLowerCase(), 1)} • `}

                        {usage.priceBehavior === "pay_as_you_go" &&
                          typeof usage.valueNumeric === "number" &&
                          `${usage.valueNumeric} ${pluralize(entitlement.feature.name.toLowerCase(), usage.valueNumeric)} ${t("used")} • `}

                        {typeof usage.meteredPrice?.price === "number" &&
                          typeof usage.valueNumeric === "number" &&
                          `${formatCurrency(usage.meteredPrice.price * usage.valueNumeric)}`}
                      </Text>
                    </Box>
                  )}
                </Box>
              )}
            </Flex>
          );
        }),
        ...featureUsage.map(({ allocation, feature, usage }, index) => {
          return (
            <Flex
              key={index}
              ref={(el) => el && elements.current.push(el)}
              $flexWrap="wrap"
              $justifyContent="space-between"
              $alignItems="center"
              $gap="1rem"
            >
              <Flex $flexGrow="1" $flexBasis="min-content" $gap="1rem">
                {props.icons.isVisible && feature?.icon && (
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

                {feature?.name && (
                  <Flex $alignItems="center">
                    <Text
                      $font={theme.typography[props.icons.fontStyle].fontFamily}
                      $size={theme.typography[props.icons.fontStyle].fontSize}
                      $weight={
                        theme.typography[props.icons.fontStyle].fontWeight
                      }
                      $color={theme.typography[props.icons.fontStyle].color}
                    >
                      {feature.name}
                    </Text>
                  </Flex>
                )}
              </Flex>

              {(feature?.featureType === "event" ||
                feature?.featureType === "trait") &&
                feature?.name && (
                  <Box
                    $flexBasis="min-content"
                    $flexGrow="1"
                    $textAlign={shouldWrapChildren ? "left" : "right"}
                  >
                    {props.entitlement.isVisible && (
                      <Box $whiteSpace="nowrap">
                        <Text
                          $font={
                            theme.typography[props.entitlement.fontStyle]
                              .fontFamily
                          }
                          $size={
                            theme.typography[props.entitlement.fontStyle]
                              .fontSize
                          }
                          $weight={
                            theme.typography[props.entitlement.fontStyle]
                              .fontWeight
                          }
                          $leading={1}
                          $color={
                            theme.typography[props.entitlement.fontStyle].color
                          }
                        >
                          {typeof allocation === "number"
                            ? `${formatNumber(allocation)} ${pluralize(
                                feature.name,
                                allocation,
                              )}`
                            : t("Unlimited", { item: pluralize(feature.name) })}
                        </Text>
                      </Box>
                    )}

                    {props.usage.isVisible && (
                      <Box $whiteSpace="nowrap">
                        <Text
                          $font={
                            theme.typography[props.usage.fontStyle].fontFamily
                          }
                          $size={
                            theme.typography[props.usage.fontStyle].fontSize
                          }
                          $weight={
                            theme.typography[props.usage.fontStyle].fontWeight
                          }
                          $leading={1}
                          $color={theme.typography[props.usage.fontStyle].color}
                        >
                          {typeof usage === "number" && (
                            <>
                              {typeof allocation === "number"
                                ? t("usage.limited", {
                                    amount: formatNumber(usage),
                                    allocation: formatNumber(allocation),
                                  })
                                : t("usage.unlimited", {
                                    amount: formatNumber(usage),
                                  })}
                            </>
                          )}
                        </Text>
                      </Box>
                    )}
                  </Box>
                )}
            </Flex>
          );
        }),
      ].slice(0, showAll)}

      <Flex $alignItems="center" $justifyContent="start" $marginTop="1rem">
        <Icon
          name={isExpanded ? "chevron-up" : "chevron-down"}
          style={{
            fontSize: "1.4rem",
            lineHeight: "1em",
            marginRight: ".25rem",
            color: "#D0D0D0",
          }}
        />
        <Text
          onClick={handleToggleShowAll}
          $font={theme.typography.link.fontFamily}
          $size={theme.typography.link.fontSize}
          $weight={theme.typography.link.fontWeight}
          $leading={1}
          $color={theme.typography.link.color}
          style={{ cursor: "pointer" }}
        >
          {isExpanded ? t("Hide all") : t("See all")}
        </Text>
      </Flex>
    </Element>
  );
});

IncludedFeatures.displayName = "IncludedFeatures";
