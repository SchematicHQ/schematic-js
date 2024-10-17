import { forwardRef, useRef } from "react";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import { type FontStyle } from "../../../context";
import {
  useEmbed,
  useIsLightBackground,
  useWrapChildren,
} from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import { formatNumber } from "../../../utils";
import { Element } from "../../layout";
import { Box, Flex, IconRound, Text, type IconNameTypes } from "../../ui";

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

  const theme = useTheme();

  const { data } = useEmbed();

  const elements = useRef<HTMLElement[]>([]);
  const shouldWrapChildren = useWrapChildren(elements.current);

  const isLightBackground = useIsLightBackground();

  // Check if we should render this component at all:
  // * If there are any plans or addons, render it, even if the list is empty.
  // * If there are any features, show it (e.g., there could be features available via company overrides
  //  even if the company has no plan or add-ons).
  // * If none of the above, don't render the component.
  const shouldShowFeatures =
    (data.featureUsage?.features ?? []).length > 0 ||
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
      $gap="1.5rem"
    >
      {props.header.isVisible && (
        <Box>
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

      {(data.featureUsage?.features || []).reduce(
        (acc: React.ReactElement[], { allocation, feature, usage }, index) => {
          return [
            ...acc,
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
                    name={feature.icon as IconNameTypes}
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
                      <Box>
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
                          $lineHeight={1.25}
                          $color={
                            theme.typography[props.entitlement.fontStyle].color
                          }
                        >
                          {typeof allocation === "number"
                            ? `${formatNumber(allocation)} ${pluralize(feature.name, allocation)}`
                            : `Unlimited ${pluralize(feature.name)}`}
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
                          $lineHeight={1.5}
                          $color={theme.typography[props.usage.fontStyle].color}
                        >
                          {typeof usage === "number" && (
                            <>
                              {typeof allocation === "number"
                                ? `${formatNumber(usage)} of ${formatNumber(allocation)} used`
                                : `${formatNumber(usage)} used`}
                            </>
                          )}
                        </Text>
                      </Box>
                    )}
                  </Box>
                )}
            </Flex>,
          ];
        },
        [],
      )}
    </Element>
  );
});

IncludedFeatures.displayName = "IncludedFeatures";
