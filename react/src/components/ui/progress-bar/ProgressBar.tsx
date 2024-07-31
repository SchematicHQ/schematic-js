import { TEXT_BASE_SIZE } from "../../../const";
import { Box, Flex, Text } from "../../ui";
import { Container } from "./styles";

export interface ProgressBarProps
  extends React.ComponentPropsWithoutRef<typeof Flex> {
  progress: number;
  value: number;
  total?: number | string;
  color?: "gray" | "orange" | "blue" | "red";
  barWidth?: string | number;
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
    <Container $alignItems="center" $gap={`${16 / 16}rem`} {...props}>
      <Flex $alignItems="center" $width={`${barWidth}`} $position="relative">
        <Flex
          $position="relative"
          $overflow="hidden"
          $width="100%"
          $height={`${8 / TEXT_BASE_SIZE}rem`}
          $background="#F2F4F7"
          $borderRadius="9999px"
        >
          <Box
            $width={`${Math.min(progress, 100)}%`}
            $height="100%"
            $background={barColorMap[color]}
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
            $padding={`${8 / 16}rem ${12 / 16}rem`}
            $background="#FFFFFF"
            $borderRadius={`${8 / 16}rem`}
            $boxShadow="0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
          >
            <Text $size={`${12 / 16}rem`} $weight="500">
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
        <Text $size={`${14 / 16}rem`} $weight="500">
          {value}/{total}
        </Text>
      )}
    </Container>
  );
};
