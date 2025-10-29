import { forwardRef, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { FeatureType, VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import { createKeyboardExecutionHandler, toPrettyDate } from "../../../utils";
import { Element } from "../../layout";
import { Box, Flex, Icon, Text } from "../../ui";

import { UsageDetails } from "./UsageDetails";

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
    // there is a typescript bug with `DeepPartial` so we must cast to `string[] | undefined`
    visibleFeatures: props.visibleFeatures as string[] | undefined,
  };
}

export type IncludedFeaturesProps = DesignProps;

export const IncludedFeatures = forwardRef<
  HTMLDivElement | null,
  ElementProps & DeepPartial<DesignProps> & React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const { data, settings } = useEmbed();

  const elementsRef = useRef<HTMLElement[]>([]);
  const shouldWrapChildren = useWrapChildren(elementsRef);

  const isLightBackground = useIsLightBackground();

  const [showCount, setShowCount] = useState(VISIBLE_ENTITLEMENT_COUNT);

  const { plan, addOns, featureUsage } = useMemo(() => {
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
      plan: data?.company?.plan,
      addOns: data?.company?.addOns || [],
      featureUsage: orderedFeatureUsage || data?.featureUsage?.features || [],
    };
  }, [
    props.visibleFeatures,
    data?.company?.plan,
    data?.company?.addOns,
    data?.featureUsage?.features,
  ]);

  const featureListSize = featureUsage.length;

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
    featureUsage.length > 0 || plan || addOns.length > 0 || false;

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
          <Text display={props.header.fontStyle}>{props.header.text}</Text>
        </Box>
      )}

      {featureUsage.slice(0, showCount).map((entitlement, index) => {
        const shouldShowDetails =
          entitlement.feature?.name &&
          (entitlement.feature?.featureType === FeatureType.Event ||
            entitlement.feature?.featureType === FeatureType.Trait);

        return (
          <Flex
            key={index}
            ref={(el) => {
              if (el) {
                elementsRef.current.push(el);
              }
            }}
            $flexWrap="wrap"
            $justifyContent="space-between"
            $alignItems="center"
            $gap="1rem"
          >
            <Flex
              $alignItems="center"
              $flexGrow={1}
              $flexBasis="min-content"
              $gap="1rem"
            >
              {props.icons.isVisible && entitlement.feature?.icon && (
                <Icon
                  name={entitlement.feature.icon}
                  color={settings.theme.primary}
                  background={
                    isLightBackground
                      ? "hsla(0, 0%, 0%, 0.0625)"
                      : "hsla(0, 0%, 100%, 0.25)"
                  }
                  rounded
                />
              )}

              {entitlement.feature?.name && (
                <Text display={props.icons.fontStyle}>
                  {entitlement.feature.name}
                </Text>
              )}

              {props.entitlementExpiration.isVisible &&
                entitlement.entitlementExpirationDate && (
                  <Text
                    display={props.entitlementExpiration.fontStyle}
                    $leading={1}
                  >
                    Expires{" "}
                    {toPrettyDate(entitlement.entitlementExpirationDate, {
                      month: "short",
                    })}
                  </Text>
                )}
            </Flex>

            {shouldShowDetails && (
              <UsageDetails
                entitlement={entitlement}
                shouldWrapChildren={shouldWrapChildren}
                layout={props}
              />
            )}
          </Flex>
        );
      })}

      {shouldShowExpand && (
        <Flex $alignItems="center" $justifyContent="start" $marginTop="1rem">
          <Icon
            name={isExpanded ? "chevron-up" : "chevron-down"}
            color="#D0D0D0"
          />

          <Text
            onClick={handleToggleShowAll}
            onKeyDown={createKeyboardExecutionHandler(handleToggleShowAll)}
            display="link"
          >
            {isExpanded ? t("Hide all") : t("See all")}
          </Text>
        </Flex>
      )}
    </Element>
  );
});

IncludedFeatures.displayName = "IncludedFeatures";
