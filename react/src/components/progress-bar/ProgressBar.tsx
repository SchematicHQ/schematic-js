import { Container } from "./styles";
import { Flex } from "../styles";

export interface ProgressBarProps
  extends React.ComponentPropsWithoutRef<typeof Flex> {
  progress: number;
  value: number;
  total?: number | string;
  color?: "gray" | "orange" | "blue" | "red";
}

export const ProgressBar = ({
  progress,
  value,
  total = 0,
  color = "gray",
  ...props
}: ProgressBarProps) => {
  const barColorMap = {
    gray: "bg-gray-400/30",
    orange: "bg-orange-500/60",
    blue: "bg-blue-500",
    red: "bg-red-600/60",
  };

  return (
    <Container $alignItems="center" $gap="1rem" {...props}>
      <div className="relative flex flex-1 items-center space-x-4">
        <div className="flex flex-1 relative h-2 bg-gray-50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColorMap[color]}`}
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: "#2563eb",
            }}
          />
        </div>
        <div
          className="absolute bottom-full -translate-y-2 -translate-x-[83%] invisible opacity-0  group-hover:opacity-100 group-hover:visible"
          style={{ left: `${progress}%` }}
        >
          <div className="py-2 px-3 font-body text-xs rounded-lg font-medium  shadow-lg bg-white">
            {progress}%
          </div>
          <div className="absolute left-[50%] translate-x-[-50%] h-0 w-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-white"></div>
        </div>
      </div>
      {total !== 0 && (
        <div className="font-body text-sm leading-none">
          {value}/{total}
        </div>
      )}
    </Container>
  );
};
