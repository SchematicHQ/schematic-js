import { forwardRef, useMemo } from "react";
import { useTheme } from "styled-components";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import { hexToHSL } from "../../../utils";
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

  const features = useMemo(() => {
    return (data.featureUsage?.features || []).map(
      ({
        access,
        allocation,
        allocationType,
        feature,
        period,
        usage = 0,
        ...props
      }) => {
        return {
          access,
          allocation,
          allocationType,
          feature,
          period,
          /**
           * @TODO: resolve feature price
           */
          price: undefined,
          usage,
          ...props,
        };
      },
    );
  }, [data.featureUsage]);

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

  return (
    <Flex ref={ref} className={className} $flexDirection="column" $gap="1.5rem">
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

      {features.reduce(
        (
          acc: React.ReactElement[],
          { allocation, allocationType, feature, usage },
          index,
        ) => {
          if (!allocationType) {
            return acc;
          }

          return [
            ...acc,
            <Flex
              key={index}
              $flexWrap="wrap"
              $justifyContent="space-between"
              $alignItems="center"
              $gap="1rem"
            >
              <Flex $gap="1rem">
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

              {allocationType === "numeric" && feature?.name && (
                <Box $textAlign="right">
                  {props.entitlement.isVisible && (
                    <Text
                      as={Box}
                      $font={
                        theme.typography[props.entitlement.fontStyle].fontFamily
                      }
                      $size={
                        theme.typography[props.entitlement.fontStyle].fontSize
                      }
                      $weight={
                        theme.typography[props.entitlement.fontStyle].fontWeight
                      }
                      $lineHeight={1.5}
                      $color={
                        theme.typography[props.entitlement.fontStyle].color
                      }
                    >
                      {typeof allocation === "number"
                        ? `${allocation} ${feature.name}`
                        : `Unlimited ${feature.name}`}
                    </Text>
                  )}

                  {props.usage.isVisible && (
                    <Text
                      as={Box}
                      $font={theme.typography[props.usage.fontStyle].fontFamily}
                      $size={theme.typography[props.usage.fontStyle].fontSize}
                      $weight={
                        theme.typography[props.usage.fontStyle].fontWeight
                      }
                      $lineHeight={1.5}
                      $color={theme.typography[props.usage.fontStyle].color}
                    >
                      {typeof allocation === "number"
                        ? `${usage} of ${allocation} used`
                        : `${usage} used`}
                    </Text>
                  )}
                </Box>
              )}
            </Flex>,
          ];
        },
        [],
      )}
    </Flex>
  );
});
