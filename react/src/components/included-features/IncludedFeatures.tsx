import { useMemo, useState } from "react";
import { RecursivePartial } from "../../types";
import { Icon, IconRound, IconNameTypes } from "../icon";
import { ProgressBar } from "../progress-bar";
import { Container } from "./styles";
import { Box, Flex, FlexText, Text } from "../styles";
import { ezdate } from "../../utils";

interface BaseFeatureProps {
  name: string;
  type: "limit" | "usage" | "addon";
  icon: IconNameTypes;
}

interface LimitFeatureProps extends BaseFeatureProps {
  value: number;
  total: number;
}

interface UsageFeatureProps extends BaseFeatureProps {
  value: number;
  unit: string;
  date: string;
}

type FeatureProps = LimitFeatureProps & UsageFeatureProps & BaseFeatureProps;

interface ContentProps {
  features: FeatureProps[];
}

interface DesignProps {
  name: {
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

export interface IncludedFeaturesProps
  extends RecursivePartial<DesignProps>,
    React.HTMLAttributes<HTMLDivElement> {
  contents: ContentProps;
}

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
  name,
  icon,
  value,
  total,
}: Omit<LimitFeatureProps, "type">) => {
  return (
    <Flex $justifyContent="space-between" $margin="0 0 1.5rem">
      <Flex $gap={16}>
        <IconRound name={icon} size="sm" />
        <FlexText
          $alignItems="center"
          $font="Public Sans"
          $size={18}
          $weight={500}
          $align="center"
        >
          {name}
        </FlexText>
      </Flex>
      <ProgressBar
        progress={(value / total) * 100}
        value={value}
        total={total}
        color="blue"
        barWidth="140px"
      />
    </Flex>
  );
};

const UsageFeature = ({
  name,
  icon,
  value,
  unit,
  date,
}: Omit<UsageFeatureProps, "type">) => {
  return (
    <Flex $justifyContent="space-between" $margin="0 0 1.5rem">
      <Flex $gap={16}>
        <IconRound name={icon} size="sm" />
        <FlexText
          $alignItems="center"
          $font="Public Sans"
          $size={18}
          $weight={500}
          $align="center"
        >
          {name}
        </FlexText>
      </Flex>
      <Box>
        <FlexText $justifyContent="end" $font="Public Sans" $weight={500}>
          {value} {unit} used
        </FlexText>
        <FlexText
          $justifyContent="end"
          $font="Public Sans"
          $size={14}
          $color="#8A8A8A"
        >
          Resets {ezdate(date)}
        </FlexText>
      </Box>
    </Flex>
  );
};

const AddonFeature = ({ name, icon }: Omit<BaseFeatureProps, "type">) => {
  return (
    <Flex $justifyContent="space-between" $margin="0 0 1.5rem">
      <Flex $gap={16}>
        <IconRound name={icon} size="sm" />
        <FlexText
          $alignItems="center"
          $font="Public Sans"
          $size={18}
          $weight={500}
          $align="center"
        >
          {name}
        </FlexText>
      </Flex>
    </Flex>
  );
};

export const IncludedFeatures = ({
  className,
  contents,
  style,
  ...props
}: IncludedFeaturesProps) => {
  const designPropsWithDefaults = resolveDesignProps(props);
  const { features } = contents;

  const [numVisible, setNumVisible] = useState(designPropsWithDefaults.count);

  const isExpanded = useMemo(
    () => numVisible > designPropsWithDefaults.count,
    [numVisible, designPropsWithDefaults.count],
  );

  const resize = () => {
    setNumVisible((prev) =>
      prev > designPropsWithDefaults.count
        ? designPropsWithDefaults.count
        : features.length,
    );
  };

  return (
    <Container {...props}>
      <FlexText
        $font="Inter"
        $size={15}
        $weight={500}
        $color="#767676"
        $margin="0 0 1.5rem"
      >
        {designPropsWithDefaults.name.text}
      </FlexText>

      {features.slice(0, numVisible).map((feature) => {
        switch (feature.type) {
          case "limit":
            return <LimitFeature key={feature.name} {...feature} />;
          case "usage":
            return <UsageFeature key={feature.name} {...feature} />;
          case "addon":
          default:
            return <AddonFeature key={feature.name} {...feature} />;
        }
      })}

      <Flex $alignItems="center" $gap={4}>
        <Icon
          name={isExpanded ? "chevron-up" : "chevron-down"}
          style={{ fontSize: "1.25rem", color: "#D0D0D0" }}
        />
        <Text
          onClick={resize}
          $weight={500}
          $color="#194BFB"
          style={{ cursor: "pointer" }}
        >
          See all
        </Text>
      </Flex>
    </Container>
  );
};
