import { RecursivePartial } from "../../types";
import { Icon, IconRound, IconNameTypes } from "../icon";
import { ProgressBar } from "../progress-bar";
import { Container } from "./styles";
import { BlockText, Flex } from "../styles";

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
    count: props.count || 4,
  };
}

const LimitFeature = ({
  name,
  icon,
  value,
  total,
}: Omit<LimitFeatureProps, "type">) => {
  return (
    <Flex>
      <Flex $flexBasis="50%" $gap="1rem">
        <IconRound name={icon} size="sm" />
        <BlockText
          $font="Public Sans"
          $size={18}
          $weight={500}
          $alignItems="center"
        >
          {name}
        </BlockText>
      </Flex>
      <ProgressBar
        $flexBasis="50%"
        progress={(value / total) * 100}
        value={value}
        total={total}
        color="blue"
        style={{ marginLeft: "2rem" }}
      />
    </Flex>
  );
};

const UsageFeature = ({
  name,
  icon,
  value,
  date,
}: Omit<UsageFeatureProps, "type">) => {
  return (
    <div>
      <IconRound name={icon} size="sm" />
      {name}
    </div>
  );
};

const AddonFeature = ({ name, icon }: Omit<BaseFeatureProps, "type">) => {
  return (
    <div>
      <IconRound name={icon} size="sm" />
      {name}
    </div>
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

  return (
    <Container {...props}>
      <BlockText
        $font="Inter"
        $size={15}
        $weight={500}
        $color="#767676"
        $margin="0 0 1.5rem"
      >
        {designPropsWithDefaults.name.text}
      </BlockText>

      {features.map((feature) => {
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

      {/* <div className="flex flex-col space-y-4">
          <div className="flex flex-row justify-between items-center">
            <div className="flex flex-row items-center space-x-2">
              <Icon
                name="alarm"
                className="text-2xl leading-none bg-gray-300 rounded-full w-10 h-10 flex items-center justify-center"
              />
              <span className="text-sm font-medium">Seats</span>
            </div>
            <div className="flex-1 max-w-[50%]">
              <ProgressBar value={25} total={100} progress={25} color="blue" />
            </div>
          </div>
          <div className="flex flex-row justify-between items-center">
            <div className="flex flex-row items-center space-x-2">
              <Icon
                name="server-search"
                className="text-2xl leading-none bg-gray-300 rounded-full w-10 h-10 flex items-center justify-center"
              />
              <span className="text-sm font-medium">AI Query</span>
            </div>
            <div className="flex-1 max-w-[50%]">
              <div className="flex flex-col items-end space-y-1">
                <div className="text-sm leading-none">$2/query</div>
                <div className="text-sm text-gray-400 leading-none">
                  15 queries | $30
                </div>
              </div>{" "}
            </div>
          </div>
          <div className="flex flex-row justify-between items-center">
            <div className="flex flex-row items-center space-x-2">
              <Icon
                name="folder"
                className="text-2xl leading-none bg-gray-300 rounded-full w-10 h-10 flex items-center justify-center"
              />
              <span className="text-sm font-medium">Projects</span>
            </div>
            <div className="flex-1 max-w-[50%]">
              <ProgressBar value={4} total={5} progress={75} color="blue" />
            </div>
          </div>
        </div> */}

      <div>
        <Icon name="chevron-down" />
        <span>See all</span>
      </div>
    </Container>
  );
};
