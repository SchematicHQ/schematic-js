import { forwardRef } from "react";

import { MAXIMUM_FRACTION_DIGITS, TEXT_BASE_SIZE } from "../../../const";
import { formatNumber } from "../../../utils";
import { Box, Flex, Text } from "../../ui";

export type ProgressBarColor = "gray" | "blue" | "yellow" | "orange" | "red";

export const progressColorMap = [
  "blue",
  "blue",
  "blue",
  "yellow",
  "red",
  "red",
] satisfies ProgressBarColor[];

export interface ProgressBarProps extends React.ComponentPropsWithoutRef<
  typeof Flex
> {
  progress: number;
  value: number;
  total?: number;
  color?: ProgressBarColor;
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

        {total > 0 && (
          <Text $size={14} $weight={500}>
            {/*
              Credit balances can be consumed at rates with up to 10 decimal
              places, so a very small `value` must render in full rather than
              rounding down to `0`. Integer counts are unaffected.
            */}
            {formatNumber(value, {
              maximumFractionDigits: MAXIMUM_FRACTION_DIGITS,
            })}
            /
            {formatNumber(total, {
              maximumFractionDigits: MAXIMUM_FRACTION_DIGITS,
            })}
          </Text>
        )}
      </Flex>
    );
  },
);

ProgressBar.displayName = "ProgressBar";
