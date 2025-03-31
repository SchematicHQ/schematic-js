import { useTheme } from "styled-components";

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
  const theme = useTheme();

  const barColorMap = {
    gray: "#9CA3AF",
    blue: "#2563EB",
    yellow: "#FFAA06",
    orange: "#DB6769",
    red: "#EF4444",
  };

  return (
    <Container {...props}>
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
      </Flex>
      {total !== 0 && (
        <Text
          $font={theme.typography.text.fontFamily}
          $size={14}
          $weight={500}
          $color={theme.typography.text.color}
        >
          {value}/{total}
        </Text>
      )}
    </Container>
  );
};
