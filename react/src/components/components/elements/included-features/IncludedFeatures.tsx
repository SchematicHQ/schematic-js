import { Fragment, forwardRef } from "react";
import { useTranslation } from "react-i18next";

import {
  IncludedFeatures as IncludedFeaturesPrimitive,
  useIncludedFeatures,
} from "../../../composable/included-features";
import { type FontStyle } from "../../../embed";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import { createKeyboardExecutionHandler, toPrettyDate } from "../../../utils";
import { Element } from "../../layout";
import { Box, Flex, Icon, Text } from "../../ui";

import { UsageDetails } from "./UsageDetails";

export interface DesignProps {
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
  const design = resolveDesignProps(rest);

  return (
    <IncludedFeaturesPrimitive.Root visibleFeatures={design.visibleFeatures}>
      <IncludedFeaturesBody ref={ref} design={design} className={className} />
    </IncludedFeaturesPrimitive.Root>
  );
});

IncludedFeatures.displayName = "IncludedFeatures";

interface IncludedFeaturesBodyProps {
  design: DesignProps;
  className?: string;
}

const IncludedFeaturesBody = forwardRef<
  HTMLDivElement | null,
  IncludedFeaturesBodyProps
>(({ design, className }, ref) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const { shouldShow, displayedFeatures, hasMore, expanded, toggle } =
    useIncludedFeatures();

  if (!shouldShow) {
    return null;
  }

  return (
    <Element ref={ref} className={className} $containerType="inline-size">
      {design.header.isVisible && (
        <Box $marginBottom="1.5rem">
          <Text display={design.header.fontStyle}>{design.header.text}</Text>
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
        {displayedFeatures.map((entitlement, index) => {
          return (
            <Fragment key={index}>
              {design.icons.isVisible && entitlement.feature?.icon && (
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
                  <Text display={design.icons.fontStyle}>
                    {entitlement.feature.name}
                  </Text>
                )}

                {design.description.isVisible &&
                  entitlement.feature?.description && (
                    <Text display={design.description.fontStyle}>
                      {entitlement.feature.description}
                    </Text>
                  )}

                {design.entitlementExpiration.isVisible &&
                  entitlement.entitlementExpirationDate && (
                    <Text
                      as="em"
                      display={design.entitlementExpiration.fontStyle}
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
                <UsageDetails entitlement={entitlement} layout={design} />
              </Flex>
            </Fragment>
          );
        })}
      </Box>

      {hasMore && (
        <Flex $alignItems="center" $marginTop="1rem">
          <Icon
            name={expanded ? "chevron-up" : "chevron-down"}
            color="#D0D0D0"
          />

          <Text
            onClick={toggle}
            onKeyDown={createKeyboardExecutionHandler(toggle)}
            display="link"
          >
            {expanded ? t("Hide all") : t("See all")}
          </Text>
        </Flex>
      )}
    </Element>
  );
});

IncludedFeaturesBody.displayName = "IncludedFeaturesBody";
