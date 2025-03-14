import { TEXT_BASE_SIZE } from "../../../const";
import { Box, Flex, Text } from "../../ui";
import { Container } from "./styles";

export const progressColorMap = [
  "blue",
  "blue",
  "blue",
  "yellow",
  "red",
  "red",
] satisfies ProgressBarProps["color"][];

export interface ProgressBarProps
  extends React.ComponentPropsWithoutRef<typeof Flex> {
  progress: number;
  value: number;
  total?: number | string;
  color?: "gray" | "blue" | "yellow" | "orange" | "red";
  bgColor?: string;
  barWidth?: string | number;
}

export const ProgressBar = ({
  progress,
  value,
  total = 0,
  color = "gray",
  bgColor = "#F2F4F7",
  barWidth = "100%",
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
    <Container
      $alignItems="center"
      $gap={`${16 / TEXT_BASE_SIZE}rem`}
      {...props}
    >
      <Flex
        $position="relative"
        $alignItems="center"
        $width={`${barWidth}`}
        $maxWidth="100%"
      >
        <Flex
          $position="relative"
          $overflow="hidden"
          $width="100%"
          $height={`${8 / TEXT_BASE_SIZE}rem`}
          $backgroundColor={bgColor}
          $borderRadius="9999px"
        >
          <Box
            $width={`${Math.min(progress, 100)}%`}
            $height="100%"
            $backgroundColor={barColorMap[color]}
            $borderRadius="9999px"
          />
        </Flex>
        {/**
           * @TODO: transform hover tip to styled components
           **
        <Box
          className="-translate-y-2 -translate-x-[50%] invisible opacity-0 group-hover:opacity-100 group-hover:visible"
          $position="absolute"
          $bottom="100%"
          $left={`${progress}%`}
        >
          <Box
            $padding={`${8 / TEXT_BASE_SIZE}rem ${12 / TEXT_BASE_SIZE}rem`}
            $backgroundColor="#FFFFFF"
            $borderRadius={`${8 / TEXT_BASE_SIZE}rem`}
            $boxShadow="0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
          >
            <Text $size={12} $weight={500}>
              {progress}%
            </Text>
          </Box>
          <Box
            className="translate-x-[-50%] h-0 w-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-white"
            $position="absolute"
            $left="50%"
          ></Box>
        </Box> */}
      </Flex>
      {total !== 0 && (
        <Text $size={14} $weight={500}>
          {value}/{total}
        </Text>
      )}
    </Container>
  );
};
