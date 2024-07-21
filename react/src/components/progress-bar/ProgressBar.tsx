import CSS from "csstype";
import { Container } from "./styles";
import { Box, Flex, FlexText } from "../styles";

export interface ProgressBarProps
  extends React.ComponentPropsWithoutRef<typeof Flex> {
  progress: number;
  value: number;
  total?: number | string;
  color?: "gray" | "orange" | "blue" | "red";
  barWidth?: CSS.Property.Width;
}

export const ProgressBar = ({
  progress,
  value,
  total = 0,
  color = "gray",
  barWidth,
  ...props
}: ProgressBarProps) => {
  const barColorMap = {
    gray: "#9CA3AF",
    blue: "#2563EB",
    yellow: "#FFAA06",
    orange: "#DB6769",
    red: "#EF4444",
  };

  return (
    <Container $alignItems="center" $gap={16} {...props}>
      <Flex
        className="group"
        $alignItems="center"
        $width={barWidth}
        $position="relative"
      >
        <Flex
          $position="relative"
          $overflow="hidden"
          $width="100%"
          $height={8}
          $background="#F2F4F7"
          $borderRadius="full"
        >
          <Box
            $width={`${Math.min(progress, 100)}%`}
            $height="100%"
            $background={barColorMap[color]}
            $borderRadius="full"
          />
        </Flex>
        <Box
          className="-translate-y-2 -translate-x-[50%] invisible opacity-0 group-hover:opacity-100 group-hover:visible"
          style={{ left: `${progress}%` }}
          $position="absolute"
          $bottom="100%"
        >
          <FlexText
            $size={12}
            $weight={500}
            $padding={`${8 / 16}rem ${12 / 16}rem`}
            $background="#FFFFFF"
            $borderRadius={8}
            $boxShadow="0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
          >
            {progress}%
          </FlexText>
          <Box
            className="translate-x-[-50%] h-0 w-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-white"
            $position="absolute"
            $left="50%"
          ></Box>
        </Box>
      </Flex>
      {total !== 0 && (
        <FlexText $size={14} $weight={500}>
          {value}/{total}
        </FlexText>
      )}
    </Container>
  );
};
