import { forwardRef, useMemo } from "react";
import { useTheme } from "styled-components";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import {
  Box,
  Flex,
  IconRound,
  ProgressBar,
  Text,
  type IconNameTypes,
} from "../../ui";

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
        usage,
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

  return (
    <Flex ref={ref} className={className} $flexDirection="column" $gap="1.5rem">
      {features.reduce(
        (
          acc: React.ReactElement[],
          { allocation, allocationType, feature, usage },
          index,
        ) => {
          if (
            !props.isVisible ||
            allocationType !== "numeric" ||
            typeof allocation !== "number"
          ) {
            return acc;
          }

          return [
            ...acc,
            <Flex key={index} $gap="1.5rem">
              {props.icon.isVisible && feature?.icon && (
                <Box $flexShrink="0">
                  <IconRound name={feature.icon as IconNameTypes} size="sm" />
                </Box>
              )}

              <Box $flexGrow="1">
                <Flex>
                  {feature?.name && (
                    <Box $flexGrow="1">
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
                        $color={theme.typography[props.header.fontStyle].color}
                      >
                        {feature.name}
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
                            theme.typography[props.description.fontStyle].color
                          }
                        >
                          {feature.description}
                        </Text>
                      )}
                    </Box>
                  )}

                  {(allocationType === "numeric" ||
                    allocationType === "unlimited") &&
                    feature?.name && (
                      <Box $textAlign="right">
                        {props.allocation.isVisible && (
                          <Text
                            as={Box}
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
                              theme.typography[props.allocation.fontStyle].color
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
                            $font={
                              theme.typography[props.usage.fontStyle].fontFamily
                            }
                            $size={
                              theme.typography[props.usage.fontStyle].fontSize
                            }
                            $weight={
                              theme.typography[props.usage.fontStyle].fontWeight
                            }
                            $color={
                              theme.typography[props.usage.fontStyle].color
                            }
                          >
                            {typeof allocation === "number"
                              ? `${usage} of ${allocation} used`
                              : `${usage} used`}
                          </Text>
                        )}
                      </Box>
                    )}
                </Flex>

                {typeof usage === "number" &&
                  typeof allocation === "number" && (
                    <Box>
                      <ProgressBar
                        progress={(usage / allocation) * 100}
                        value={usage}
                        total={allocation}
                        color="blue"
                      />
                    </Box>
                  )}
              </Box>
            </Flex>,
          ];
        },
        [],
      )}
    </Flex>
  );
});
