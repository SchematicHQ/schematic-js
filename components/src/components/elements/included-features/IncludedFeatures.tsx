import { Fragment, forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useTruncatedList,
} from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import {
  getFeatureName,
  getPerLicenseGrantsForFeature,
  toPrettyDate,
} from "../../../utils";
import { Element } from "../../layout";
import { ExpandListToggle } from "../../shared";
import { Box, Flex, Icon, Text } from "../../ui";

import { UsageDetails } from "./UsageDetails";

interface DesignProps {
  visibleFeatures?: string[];
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
  description: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  entitlementExpiration: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  entitlement: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  usage: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
}

function resolveDesignProps(props: DeepPartial<DesignProps>): DesignProps {
  return {
    // there is a typescript bug with `DeepPartial` so we must cast to `string[] | undefined`
    visibleFeatures: props.visibleFeatures as string[] | undefined,
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
    description: {
      isVisible: props.description?.isVisible ?? true,
      fontStyle: props.description?.fontStyle ?? "heading6",
    },
    entitlementExpiration: {
      isVisible: props.entitlementExpiration?.isVisible ?? true,
      fontStyle: props.entitlementExpiration?.fontStyle ?? "heading6",
    },
    entitlement: {
      isVisible: props.entitlement?.isVisible ?? true,
      fontStyle: props.entitlement?.fontStyle ?? "text",
    },
    usage: {
      isVisible: props.usage?.isVisible ?? true,
      fontStyle: props.usage?.fontStyle ?? "heading6",
    },
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

  const isLightBackground = useIsLightBackground();

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

  const visibleFeatureUsage = useTruncatedList(featureUsage, {
    limit: VISIBLE_ENTITLEMENT_COUNT,
  });

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

  return (
    <Element ref={ref} className={className} $containerType="inline-size">
      {props.header.isVisible && (
        <Box $marginBottom="1.5rem">
          <Text display={props.header.fontStyle}>{props.header.text}</Text>
        </Box>
      )}

      <Box
        $display="grid"
        $gridTemplateColumns="min-content 1fr"
        $columnGap="0.5rem"
        $viewport={{
          xs: {
            $gridTemplateColumns: "min-content 3fr 2fr",
            $rowGap: "1.5rem",
          },
        }}
      >
        {visibleFeatureUsage.items.map((entitlement, index) => {
          return (
            <Fragment key={index}>
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
                  style={{ marginRight: "0.5rem" }}
                />
              )}

              <Flex
                $flexDirection="column"
                $alignSelf="baseline"
                $gap="0.25rem"
              >
                {entitlement.feature?.name && (
                  <Text display={props.icons.fontStyle}>
                    {entitlement.feature.name}
                  </Text>
                )}

                {props.description.isVisible &&
                  entitlement.feature?.description && (
                    <Text display={props.description.fontStyle}>
                      {entitlement.feature.description}
                    </Text>
                  )}

                {getPerLicenseGrantsForFeature(
                  plan?.includedCreditGrants,
                  entitlement.feature,
                ).map((grant, grantIndex) => (
                  <Text key={grantIndex} display={props.description.fontStyle}>
                    {t("Includes X credits per license", {
                      amount: grant.creditAmount,
                      creditName: getFeatureName(
                        {
                          name: grant.creditName,
                          singularName: grant.singularName,
                          pluralName: grant.pluralName,
                        },
                        grant.creditAmount,
                      ),
                      licenseName: entitlement.feature
                        ? getFeatureName(entitlement.feature, 1)
                        : "",
                    })}
                  </Text>
                ))}

                {props.entitlementExpiration.isVisible &&
                  entitlement.entitlementExpirationDate && (
                    <Text
                      as="em"
                      display={props.entitlementExpiration.fontStyle}
                    >
                      {t("Expires", {
                        date: toPrettyDate(
                          entitlement.entitlementExpirationDate,
                          {
                            month: "short",
                          },
                        ),
                      })}
                    </Text>
                  )}
              </Flex>

              <Flex
                $gridColumn="span 2"
                $flexDirection="column"
                $gap="0.25rem"
                $marginBottom="1.5rem"
                $marginLeft="3.75rem"
                $viewport={{
                  xs: {
                    $gridColumn: 3,
                    $alignSelf: "baseline",
                    $textAlign: "right",
                    $marginBottom: 0,
                    $marginLeft: 0,
                  },
                }}
              >
                <UsageDetails entitlement={entitlement} layout={props} />
              </Flex>
            </Fragment>
          );
        })}
      </Box>

      {visibleFeatureUsage.canExpand && (
        <ExpandListToggle
          isExpanded={visibleFeatureUsage.isExpanded}
          onToggle={visibleFeatureUsage.toggle}
          $marginTop="1rem"
        />
      )}
    </Element>
  );
});

IncludedFeatures.displayName = "IncludedFeatures";
