import { forwardRef } from "react";

import { TEXT_BASE_SIZE } from "../../../const";
import { formatNumber } from "../../../utils";
import { Box, Flex, Text } from "../../ui";

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
  total?: number;
  color?: "gray" | "blue" | "yellow" | "orange" | "red";
  bgColor?: string;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      progress,
      value,
      total = 0,
      color = "gray",
      bgColor = "#F2F4F7",
      ...props
    },
    ref,
  ) => {
    const barColorMap = {
      gray: "#9CA3AF",
      blue: "#2563EB",
      yellow: "#FFAA06",
      orange: "#DB6769",
      red: "#EF4444",
    };

    return (
      <Flex
        ref={ref}
        $position="relative"
        $alignItems="center"
        $gap="1rem"
        $width="100%"
        {...props}
      >
        <Box
          $overflow="hidden"
          $width="100%"
          $minWidth="6rem"
          $height={`${8 / TEXT_BASE_SIZE}rem`}
          $backgroundColor={bgColor}
          $borderRadius="9999px"
        >
          <Box
            $width={`${Math.min(progress, 100)}%`}
            $height="100%"
            $backgroundColor={barColorMap[color]}
          />
        </Box>

        {total && (
          <Text $size={14} $weight={500}>
            {formatNumber(value)}/{formatNumber(total)}
          </Text>
        )}
      </Flex>
    );
  },
);

ProgressBar.displayName = "ProgressBar";
