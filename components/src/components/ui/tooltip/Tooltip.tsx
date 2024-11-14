import { useTheme } from "styled-components";
import { Box, Text } from "../../ui";
import { TooltipWrapper } from "./styles";

interface TooltipProps {
  label: string;
  description: string;
}

export const Tooltip = ({ label, description }: TooltipProps) => {
  const theme = useTheme();

  return (
    <TooltipWrapper>
      <Box>
        <Text
          $font={theme.typography.text.fontFamily}
          $size={theme.typography.text.fontSize}
          $weight={theme.typography.text.fontWeight}
          $color={theme.typography.text.color}
        >
          {label}
        </Text>
      </Box>

      <Box className="tooltip">
        <Text
          $font={theme.typography.text.fontFamily}
          $size={theme.typography.text.fontSize}
          $weight={theme.typography.text.fontWeight}
          $color={theme.typography.text.color}
          $leading={1.15}
        >
          {description}
        </Text>
      </Box>
    </TooltipWrapper>
  );
};
