import { forwardRef, useMemo } from "react";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
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
  title: {
    text: string;
    style: {
      fontFamily: string;
      fontSize: number;
      fontWeight: number;
      color: string;
    };
  };
  limits: {
    isVisible: boolean;
  };
  usage: {
    isVisible: boolean;
  };
  count: number;
}

export type IncludedFeaturesProps = ElementProps &
  RecursivePartial<DesignProps> &
  React.HTMLAttributes<HTMLDivElement>;

function resolveDesignProps(props: RecursivePartial<DesignProps>) {
  return {
    title: {
      text: props.title?.text || "Included features",
      style: {
        fontFamily: props.title?.style?.fontFamily || "Inter",
        fontSize: props.title?.style?.fontSize || 15,
        fontWeight: props.title?.style?.fontWeight || 500,
        color: props.title?.style?.color || "#767676",
      },
    },
    limits: {
      isVisible: props.limits?.isVisible || true,
    },
    usage: {
      isVisible: props.usage?.isVisible || true,
    },
    count: props.count || 3,
  };
}

export const IncludedFeatures = forwardRef<
  HTMLDivElement | null,
  IncludedFeaturesProps
>(({ className, ...props }, ref) => {
  const designPropsWithDefaults = resolveDesignProps(props);

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
    <div ref={ref} className={className}>
      <Box $margin="0 0 1.5rem">
        <Text $font="Inter" $size={15} $weight={500} $color="#767676">
          {designPropsWithDefaults.title.text}
        </Text>
      </Box>

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
              $justifyContent="space-between"
              $margin="0 0 1.5rem"
            >
              <Flex $gap={`${16 / TEXT_BASE_SIZE}rem`}>
                {feature?.icon && (
                  <IconRound name={feature.icon as IconNameTypes} size="sm" />
                )}
                {feature?.name && (
                  <Flex $alignItems="center">
                    <Text
                      $font="Public Sans"
                      $size={18}
                      $weight={500}
                      $align="center"
                    >
                      {feature.name}
                    </Text>
                  </Flex>
                )}
              </Flex>

              {typeof allocation === "number" && (
                <ProgressBar
                  progress={((usage || 0) / allocation) * 100}
                  value={usage || 0}
                  total={allocation}
                  color="blue"
                  barWidth="128px"
                />
              )}

              {allocationType !== "boolean" &&
                typeof allocation !== "number" && (
                  <Flex $alignItems="center">
                    {feature?.featureType && (
                      <Text
                        as={Box}
                        $font="Public Sans"
                        $weight={500}
                        $align="right"
                      >
                        {usage} {feature.featureType} used
                      </Text>
                    )}
                    {/**
                        * @TODO: resolve date
                        **
                      <Text
                        as={Box}
                        $font="Public Sans"
                        $size={14}
                        $color="#8A8A8A"
                        $align="right"
                      >
                        Resets {toMonthDay(date)}
                      </Text>
                      */}
                  </Flex>
                )}
            </Flex>,
          ];
        },
        [],
      )}
    </div>
  );
});
