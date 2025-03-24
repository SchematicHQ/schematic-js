import { forwardRef, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import type {
  FeatureUsageResponseData,
  UsageBasedEntitlementResponseData,
} from "../../../api";
import { VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { ElementProps, RecursivePartial } from "../../../types";
import { toPrettyDate } from "../../../utils";
import { Element } from "../../layout";
import { Box, Flex, Icon, type IconNameTypes, IconRound, Text } from "../../ui";
import { Details } from "./Details";

export interface DesignProps {
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
    entitlementExpiration: {
      isVisible: props.entitlementExpiration?.isVisible ?? true,
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
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const theme = useTheme();

  const { data } = useEmbed();

  const elements = useRef<HTMLElement[]>([]);
  const shouldWrapChildren = useWrapChildren(elements.current);

  const isLightBackground = useIsLightBackground();

  const [showCount, setShowCount] = useState(VISIBLE_ENTITLEMENT_COUNT);

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

  const entitlements: {
    featureUsage: FeatureUsageResponseData;
    usageData?: UsageBasedEntitlementResponseData;
  }[] = (orderedFeatureUsage || data.featureUsage?.features || []).reduce(
    (
      acc: {
        featureUsage: FeatureUsageResponseData;
        usageData?: UsageBasedEntitlementResponseData;
      }[],
      usage,
    ) => {
      const mappedUsageData = data.activeUsageBasedEntitlements.find(
        (entitlement) => entitlement.featureId === usage.feature?.id,
      );

      acc.push({
        featureUsage: usage,
        usageData: mappedUsageData,
      });

      return acc;
    },
    [],
  );

  const featureListSize = entitlements.length;

  const handleToggleShowAll = () => {
    setShowCount((prev) =>
      prev > VISIBLE_ENTITLEMENT_COUNT
        ? VISIBLE_ENTITLEMENT_COUNT
        : featureListSize,
    );
  };

  // Check if we should render this component at all:
  // * If there are any plans or addons, render it, even if the list is empty.
  // * If there are any features, show it (e.g., there could be features available via company overrides
  //  even if the company has no plan or add-ons).
  // * If none of the above, don't render the component.
  const shouldShowFeatures =
    entitlements.length > 0 ||
    data.company?.plan ||
    (data.company?.addOns ?? []).length > 0 ||
    false;

  if (!shouldShowFeatures) {
    return null;
  }

  const shouldShowExpand = featureListSize > VISIBLE_ENTITLEMENT_COUNT;
  const isExpanded = showCount > VISIBLE_ENTITLEMENT_COUNT;

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

      {entitlements.slice(0, showCount).map((entitlement, index) => {
        const { entitlementExpirationDate, feature } =
          entitlement.featureUsage || {};
        const shouldShowDetails =
          feature?.name &&
          (feature?.featureType === "event" ||
            feature?.featureType === "trait");

        return (
          <Flex
            key={index}
            ref={(el) => {
              if (el) {
                elements.current.push(el);
              }
            }}
            $flexWrap="wrap"
            $justifyContent="space-between"
            $alignItems="center"
            $gap="1rem"
          >
            <Flex
              $alignItems="center"
              $flexGrow="1"
              $flexBasis="min-content"
              $gap="1rem"
            >
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
                <Text
                  $font={theme.typography[props.icons.fontStyle].fontFamily}
                  $size={theme.typography[props.icons.fontStyle].fontSize}
                  $weight={theme.typography[props.icons.fontStyle].fontWeight}
                  $color={theme.typography[props.icons.fontStyle].color}
                >
                  {feature.name}
                </Text>
              )}

              {props.entitlementExpiration.isVisible &&
                entitlementExpirationDate && (
                  <Text
                    $font={
                      theme.typography[props.entitlementExpiration.fontStyle]
                        .fontFamily
                    }
                    $size={
                      theme.typography[props.entitlementExpiration.fontStyle]
                        .fontSize
                    }
                    $weight={
                      theme.typography[props.entitlementExpiration.fontStyle]
                        .fontWeight
                    }
                    $color={
                      theme.typography[props.entitlementExpiration.fontStyle]
                        .color
                    }
                    $leading={1}
                  >
                    Expires{" "}
                    {toPrettyDate(entitlementExpirationDate, {
                      month: "short",
                    })}
                  </Text>
                )}
            </Flex>

            {shouldShowDetails && (
              <Details
                details={entitlement}
                shouldWrapChildren={shouldWrapChildren}
                {...props}
              />
            )}
          </Flex>
        );
      })}

      {shouldShowExpand && (
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
            $color={theme.typography.link.color}
            $leading={1}
            style={{ cursor: "pointer" }}
          >
            {isExpanded ? t("Hide all") : t("See all")}
          </Text>
        </Flex>
      )}
    </Element>
  );
});

IncludedFeatures.displayName = "IncludedFeatures";
