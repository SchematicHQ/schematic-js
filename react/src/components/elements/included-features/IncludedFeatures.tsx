import { useMemo, useState } from "react";
import { type FeatureUsageResponseData } from "../../../api";
import { useEmbed } from "../../../hooks";
import type { RecursivePartial, ElementProps } from "../../../types";
import {
  Box,
  Button,
  Flex,
  Icon,
  IconRound,
  ProgressBar,
  Text,
  type IconNameTypes,
} from "../../ui";

interface DesignProps {
  name?: {
    text: string;
    style: {
      fontFamily: string;
      fontSize: number;
      fontWeight: number;
      color: string;
    };
  };
  limits?: {
    isVisible: boolean;
  };
  usage?: {
    isVisible: boolean;
  };
  count?: number;
}

export type IncludedFeaturesProps = ElementProps &
  RecursivePartial<DesignProps> &
  React.HTMLAttributes<HTMLDivElement>;

function resolveDesignProps(props: RecursivePartial<DesignProps>) {
  return {
    name: {
      text: props.name?.text || "Included features",
      style: {
        fontFamily: props.name?.style?.fontFamily || "Inter",
        fontSize: props.name?.style?.fontSize || 16,
        fontWeight: props.name?.style?.fontWeight || 500,
        color: props.name?.style?.color || "#000000",
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

const LimitFeature = ({
  feature,
  allocation,
  usage,
}: RecursivePartial<FeatureUsageResponseData>) => {
  if (!feature) {
    return null;
  }

  return (
    <Flex $justifyContent="space-between" $margin="0 0 1.5rem">
      <Flex $gap={`${16 / 16}rem`}>
        <IconRound name={feature.icon as IconNameTypes} size="sm" />
        <Flex $alignItems="center">
          <Text
            $font="Public Sans"
            $size={`${18 / 16}rem`}
            $weight="500"
            $align="center"
          >
            {feature.name}
          </Text>
        </Flex>
      </Flex>
      {typeof allocation === "number" && (
        <ProgressBar
          progress={((usage || 0) / allocation) * 100}
          value={usage || 0}
          total={allocation}
          color="blue"
          barWidth="140px"
        />
      )}
    </Flex>
  );
};

const UsageFeature = ({
  feature,
  usage,
}: RecursivePartial<FeatureUsageResponseData>) => {
  if (!feature) {
    return null;
  }

  return (
    <Flex $justifyContent="space-between" $margin="0 0 1.5rem">
      <Flex $gap={`${16 / 16}rem`}>
        <IconRound name={feature.icon as IconNameTypes} size="sm" />
        <Flex $alignItems="center">
          <Text
            $font="Public Sans"
            $size={`${18 / 16}rem`}
            $weight="500"
            $align="center"
          >
            {feature.name}
          </Text>
        </Flex>
      </Flex>
      <Flex $alignItems="center">
        <Text as={Box} $font="Public Sans" $weight="500" $align="right">
          {usage} {feature.featureType} used
        </Text>
        {/**
          * @TODO: resolve date
          *
        <Text
          as={Box}
          $font="Public Sans"
          $size={`${14 / 16}rem`}
          $color="#8A8A8A"
          $align="right"
        >
          Resets {toMonthDay(date)}
        </Text>
        */}
      </Flex>
    </Flex>
  );
};

const AddonFeature = ({
  feature,
}: RecursivePartial<FeatureUsageResponseData>) => {
  if (!feature) {
    return null;
  }

  return (
    <Flex $justifyContent="space-between" $margin="0 0 1.5rem">
      <Flex $gap={`${16 / 16}rem`}>
        {feature.icon && (
          <IconRound name={feature.icon as IconNameTypes} size="sm" />
        )}
        <Flex $alignItems="center">
          <Text
            $font="Public Sans"
            $size={`${18 / 16}rem`}
            $weight="500"
            $align="center"
          >
            {feature.name}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  );
};

export const IncludedFeatures = ({
  className,
  ...props
}: IncludedFeaturesProps) => {
  const designPropsWithDefaults = resolveDesignProps(props);

  const { data } = useEmbed();

  const [numVisible, setNumVisible] = useState(designPropsWithDefaults.count);

  const isExpanded = useMemo(
    () => numVisible > designPropsWithDefaults.count,
    [numVisible, designPropsWithDefaults.count],
  );

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

  const resize = () => {
    setNumVisible((prev) =>
      prev > designPropsWithDefaults.count
        ? designPropsWithDefaults.count
        : features.length,
    );
  };

  return (
    <div className={className}>
      <Box $margin="0 0 1.5rem">
        <Text
          $font="Inter"
          $size={`${15 / 16}rem`}
          $weight="500"
          $color="#767676"
        >
          {designPropsWithDefaults.name.text}
        </Text>
      </Box>

      {features
        .slice(0, numVisible)
        .reduce((acc: React.ReactElement[], feature, index) => {
          if (feature.allocationType === "boolean") {
            return [...acc, <AddonFeature key={index} {...feature} />];
          }

          if (
            feature.allocationType === "numeric" ||
            feature.allocationType === "trait" ||
            feature.allocationType === "unlimited"
          ) {
            if (typeof feature.allocation === "number") {
              return [...acc, <LimitFeature key={index} {...feature} />];
            }

            return [...acc, <UsageFeature key={index} {...feature} />];
          }

          return acc;
        }, [])}

      <Flex $alignItems="center" $gap={`${4 / 16}rem`}>
        <Icon
          name={isExpanded ? "chevron-up" : "chevron-down"}
          style={{ fontSize: "1.25rem", color: "#D0D0D0" }}
        />
        <Button onClick={resize} color="blue" variant="link">
          <Text $weight="500">See all</Text>
        </Button>
      </Flex>
    </div>
  );
};
