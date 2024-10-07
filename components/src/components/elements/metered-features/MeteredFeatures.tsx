import { forwardRef, useLayoutEffect, useMemo, useRef } from "react";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import { formatNumber, hexToHSL } from "../../../utils";
import { Element } from "../../layout";
import {
  Box,
  Flex,
  IconRound,
  ProgressBar,
  Text,
  type IconNameTypes,
  type ProgressBarProps,
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

  const elements = useRef<HTMLElement[]>([]);

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

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

  useLayoutEffect(() => {
    const assignRows = (parent: Element) => {
      let isWrapped = true;
      [...parent.children].forEach((el) => {
        if (!(el instanceof HTMLElement)) {
          return;
        }

        if (
          !el.previousElementSibling ||
          el.offsetLeft <= (el.previousElementSibling as HTMLElement).offsetLeft
        ) {
          isWrapped = !isWrapped;
        }

        if (isWrapped) {
          el.style.textAlign = "left";
        } else if (el.previousElementSibling) {
          el.style.textAlign = "right";
        }
      });
    };

    elements.current.forEach((el) => {
      if (!el) return;

      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          assignRows(entry.target);
        });
      });

      observer.observe(el);
      assignRows(el);
    });
  }, [elements.current.length]);

  return (
    <Flex ref={ref} className={className} $flexDirection="column">
      {features.reduce(
        (
          acc: React.ReactElement[],
          { allocation, allocationType, feature, usage },
          index,
        ) => {
          if (allocationType !== "numeric") {
            return acc;
          }

          return [
            ...acc,
            <Element as={Flex} key={index} $gap="1.5rem">
              {props.icon.isVisible && feature?.icon && (
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

              <Flex $flexDirection="column" $gap="2rem" $flexGrow="1">
                <Flex
                  ref={(el) => elements.current.push(el!)}
                  $flexWrap="wrap"
                  $gap="1rem"
                >
                  {feature?.name && (
                    <Flex $flexDirection="column" $gap="0.5rem" $flexGrow="1">
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
                    </Flex>
                  )}

                  {(allocationType === "numeric" ||
                    allocationType === "unlimited") &&
                    feature?.name && (
                      <Box
                        $flexBasis="min-content"
                        $flexGrow="1"
                        $textAlign="right"
                      >
                        {props.usage.isVisible && typeof usage === "number" && (
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
                            $lineHeight={1.25}
                            $color={
                              theme.typography[props.usage.fontStyle].color
                            }
                          >
                            {formatNumber(usage)}{" "}
                            {pluralize(feature.name, usage)}
                          </Text>
                        )}

                        {props.allocation.isVisible && (
                          <Box $whiteSpace="nowrap">
                            <Text
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
                                theme.typography[props.allocation.fontStyle]
                                  .color
                              }
                            >
                              {typeof allocation === "number"
                                ? `Limit of ${formatNumber(allocation)}`
                                : "No limit"}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    )}
                </Flex>

                {props.isVisible &&
                  typeof usage === "number" &&
                  typeof allocation === "number" && (
                    <Box>
                      <ProgressBar
                        progress={(usage / allocation) * 100}
                        value={usage}
                        total={allocation}
                        color={
                          (
                            [
                              "blue",
                              "blue",
                              "yellow",
                              "red",
                            ] satisfies ProgressBarProps["color"][]
                          )[Math.floor((usage / allocation) * 4)]
                        }
                      />
                    </Box>
                  )}
              </Flex>
            </Element>,
          ];
        },
        [],
      )}
    </Flex>
  );
});
