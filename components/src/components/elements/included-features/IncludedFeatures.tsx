import { forwardRef, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import { type FeatureUsageResponseData } from "../../../api";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { formatNumber, toPrettyDate } from "../../../utils";
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
  entitlementExpiration: {
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
    entitlementExpiration: {
      fontStyle: props.entitlementExpiration?.fontStyle ?? "heading6",
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

  // Check if we should render this component at all:
  // * If there are any plans or addons, render it, even if the list is empty.
  // * If there are any features, show it (e.g., there could be features available via company overrides
  //  even if the company has no plan or add-ons).
  // * If none of the above, don't render the component.
  const shouldShowFeatures =
    featureUsage.length > 0 ||
    data.company?.plan ||
    (data.company?.addOns ?? []).length > 0 ||
    false;

  const handleToggleShowAll = () => {
    if (isExpanded) {
      setShowAll(visibleCount);
    } else {
      setShowAll(featureUsage.length);
    }
    setIsExpanded(!isExpanded); // Toggle state
  };

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

      {featureUsage
        .slice(0, showAll)
        .map(
          (
            { allocation, feature, usage, entitlementExpirationDate },
            index,
          ) => {
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
                    <Flex $alignItems="left" $flexDirection="column">
                      <Text
                        $font={
                          theme.typography[props.icons.fontStyle].fontFamily
                        }
                        $size={theme.typography[props.icons.fontStyle].fontSize}
                        $weight={
                          theme.typography[props.icons.fontStyle].fontWeight
                        }
                        $color={theme.typography[props.icons.fontStyle].color}
                      >
                        {feature.name}
                      </Text>
                      {entitlementExpirationDate && (
                        <Text
                          $font={
                            theme.typography[
                              props.entitlementExpiration.fontStyle
                            ].fontFamily
                          }
                          $size={
                            theme.typography[
                              props.entitlementExpiration.fontStyle
                            ].fontSize
                          }
                          $weight={
                            theme.typography[
                              props.entitlementExpiration.fontStyle
                            ].fontWeight
                          }
                          $leading={1}
                          $color={
                            theme.typography[
                              props.entitlementExpiration.fontStyle
                            ].color
                          }
                        >
                          Expires{" "}
                          {toPrettyDate(entitlementExpirationDate, {
                            month: "short",
                          })}
                        </Text>
                      )}
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
                              theme.typography[props.entitlement.fontStyle]
                                .color
                            }
                          >
                            {typeof allocation === "number"
                              ? `${formatNumber(allocation)} ${pluralize(feature.name, allocation)}`
                              : t("Unlimited", {
                                  item: pluralize(feature.name),
                                })}
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
                            $color={
                              theme.typography[props.usage.fontStyle].color
                            }
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
          },
        )}

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
