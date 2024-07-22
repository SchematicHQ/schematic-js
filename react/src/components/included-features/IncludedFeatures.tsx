import { useMemo, useState } from "react";
import { ezdate } from "../../utils";
import { RecursivePartial } from "../../types";
import { Box } from "../box";
import { Button } from "../button";
import { Flex } from "../flex";
import { Icon, IconRound, type IconNameTypes } from "../icon";
import { ProgressBar } from "../progress-bar";
import { Text } from "../text";
import { Container } from "./styles";

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
    <Flex $margin="0 0 1.5rem">
      <Flex $gap={`${16 / 16}rem`}>
        <IconRound name={icon} size="sm" />
        <Text
          as={Flex}
          $alignItems="center"
          $font="Public Sans"
          $size={`${18 / 16}rem`}
          $weight="500"
          $align="center"
        >
          {name}
        </Text>
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
      <Flex $gap={`${16 / 16}rem`}>
        <IconRound name={icon} size="sm" />
        <Text
          as={Flex}
          $alignItems="center"
          $font="Public Sans"
          $size={`${18 / 16}rem`}
          $weight="500"
          $align="center"
        >
          {name}
        </Text>
      </Flex>
      <Box>
        <Text as={Flex} $justifyContent="end" $font="Public Sans" $weight="500">
          {value} {unit} used
        </Text>
        <Text
          as={Flex}
          $justifyContent="end"
          $font="Public Sans"
          $size={`${14 / 16}rem`}
          $color="#8A8A8A"
        >
          Resets {ezdate(date)}
        </Text>
      </Box>
    </Flex>
  );
};

const AddonFeature = ({ name, icon }: Omit<BaseFeatureProps, "type">) => {
  return (
    <Flex $justifyContent="space-between" $margin="0 0 1.5rem">
      <Flex $gap={`${16 / 16}rem`}>
        <IconRound name={icon} size="sm" />
        <Text
          as={Flex}
          $alignItems="center"
          $font="Public Sans"
          $size={`${18 / 16}rem`}
          $weight="500"
          $align="center"
        >
          {name}
        </Text>
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
      <Text
        as={Flex}
        $font="Inter"
        $size={`${15 / 16}rem`}
        $weight="500"
        $color="#767676"
        $margin="0 0 1.5rem"
      >
        {designPropsWithDefaults.name.text}
      </Text>

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
