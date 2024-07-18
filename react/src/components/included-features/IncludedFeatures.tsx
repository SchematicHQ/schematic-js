import { RecursivePartial } from "../../types";
import { Icon } from "../icon";
import { ProgressBar } from "../progress-bar";

interface FeatureProps {
  name: string;
  type: string;
  value?: number;
  limit?: number;
  date?: string;
}

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

export const IncludedFeatures = ({
  className,
  contents,
  style,
  ...props
}: IncludedFeaturesProps) => {
  const designPropsWithDefaults = resolveDesignProps(props);
  const { features } = contents;

  return (
    <div
      className="relative z-[2] px-8 py-8 bg-white cursor-pointer"
      {...props}
    >
      <div className="relative z-[1] bg-white flex flex-col space-y-4">
        <div className="text-sm text-gray-400 leading-none">
          {designPropsWithDefaults.name.text}
        </div>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-row justify-between items-center">
            <div className="flex flex-row items-center space-x-2">
              <Icon
                name="alarm"
                className="text-2xl leading-none bg-gray-300 rounded-full w-10 h-10 flex items-center justify-center"
              />
              <span className="text-sm font-medium">Seats</span>
            </div>
            <div className="relative flex-1 max-w-[50%]">
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
            <div className="relative flex-1 max-w-[50%]">
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
            <div className="relative flex-1 max-w-[50%]">
              <ProgressBar value={4} total={5} progress={75} color="blue" />
            </div>
          </div>
        </div>
        <div className="flex flex-row space-x-2 items-center mt-3">
          <Icon name="chevron-down" className="text-gray-400 leading-none" />
          <span className="text-blue-400 font-medium font-display text-sm">
            See all
          </span>
        </div>
      </div>
    </div>
  );
};
