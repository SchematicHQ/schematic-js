import { forwardRef, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import {
  createKeyboardExecutionHandler,
  isCheckoutData,
  toPrettyDate,
} from "../../../utils";
import { Element } from "../../layout";
import { Box, Flex, Icon, Text } from "../../ui";

import { Details } from "./Details";

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

  const elements = useRef<HTMLElement[]>([]);
  const shouldWrapChildren = useWrapChildren(elements.current);

  const isLightBackground = useIsLightBackground();

  const [showCount, setShowCount] = useState(VISIBLE_ENTITLEMENT_COUNT);

  const { plan, addOns, featureUsage } = useMemo(() => {
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
        plan: data.company?.plan,
        addOns: data.company?.addOns || [],
        featureUsage: orderedFeatureUsage || data.featureUsage?.features || [],
      };
    }

    return {
      plan: undefined,
      addOns: [],
      featureUsage: [],
    };
  }, [props.visibleFeatures, data]);

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

      {featureUsage.slice(0, showCount).map((usage, index) => {
        const feature = usage.feature;
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

              {feature?.name && (
                <Text display={props.icons.fontStyle}>{feature.name}</Text>
              )}

              {props.entitlementExpiration.isVisible &&
                usage.entitlementExpirationDate && (
                  <Text
                    display={props.entitlementExpiration.fontStyle}
                    $leading={1}
                  >
                    Expires{" "}
                    {toPrettyDate(usage.entitlementExpirationDate, {
                      month: "short",
                    })}
                  </Text>
                )}
            </Flex>

            {shouldShowDetails && (
              <Details
                entitlement={props.entitlement}
                usage={props.usage}
                featureUsage={usage}
                shouldWrapChildren={shouldWrapChildren}
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
