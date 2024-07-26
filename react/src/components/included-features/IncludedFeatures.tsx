import { useMemo, useState } from "react";
import { type FeatureUsageResponseData } from "../../api";
import { useSchematicEmbed } from "../../hooks";
import type { RecursivePartial } from "../../types";
import { Box } from "../ui/box";
import { Button } from "../ui/button";
import { Flex } from "../ui/flex";
import { Icon, IconRound, type IconNameTypes } from "../ui/icon";
import { ProgressBar } from "../ui/progress-bar";
import { Text } from "../ui/text";
import { Container } from "./styles";

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

export interface IncludedFeaturesProps
  extends RecursivePartial<DesignProps>,
    React.HTMLAttributes<HTMLDivElement> {}

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
}: FeatureUsageResponseData) => {
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
          progress={(usage || 0 / allocation) * 100}
          value={usage || 0}
          total={allocation}
          color="blue"
          barWidth="140px"
        />
      )}
    </Flex>
  );
};

const UsageFeature = ({ feature, usage }: FeatureUsageResponseData) => {
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
      <Box>
        <Text as={Box} $font="Public Sans" $weight="500" $align="right">
          {usage} {feature.featureType} used
        </Text>
        {/* TODO: resolve date */}
        {/* <Text
          as={Box}
          $font="Public Sans"
          $size={`${14 / 16}rem`}
          $color="#8A8A8A"
          $align="right"
        >
          Resets {toMonthDay(date)}
        </Text> */}
      </Box>
    </Flex>
  );
};

const AddonFeature = ({ feature }: FeatureUsageResponseData) => {
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

export const IncludedFeatures = (props: IncludedFeaturesProps) => {
  const designPropsWithDefaults = resolveDesignProps(props);

  const [numVisible, setNumVisible] = useState(designPropsWithDefaults.count);

  const isExpanded = useMemo(
    () => numVisible > designPropsWithDefaults.count,
    [numVisible, designPropsWithDefaults.count],
  );

  const { data } = useSchematicEmbed();

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
          // TODO: resolve feature price
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
    <Container style={props.style}>
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

      {features.slice(0, numVisible).reduce((acc, feature, index) => {
        if (feature.allocationType === "boolean") {
          return [...acc, <AddonFeature key={index} {...feature} />];
        }

        if (
          feature.allocationType === "numeric" ||
          feature.allocationType === "trait" ||
          feature.allocationType === "unlimited"
        ) {
          console.log(feature.allocation);
          if (typeof feature.allocation === "number") {
            return [...acc, <LimitFeature key={index} {...feature} />];
          }

          return [...acc, <UsageFeature key={index} {...feature} />];
        }

        return acc;
      }, [] as React.ReactElement[])}

      <Flex $alignItems="center" $gap={`${4 / 16}rem`}>
        <Icon
          name={isExpanded ? "chevron-up" : "chevron-down"}
          style={{ fontSize: "1.25rem", color: "#D0D0D0" }}
        />
        <Button onClick={resize} color="blue" variant="link">
          <Text $weight="500">See all</Text>
        </Button>
      </Flex>
    </Container>
  );
};
