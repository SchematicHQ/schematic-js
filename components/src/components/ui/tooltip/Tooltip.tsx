import { Box, type BoxProps } from "../../ui";
import { TooltipWrapper } from "./styles";

interface TooltipProps extends BoxProps {
  label: React.ReactNode;
  description: React.ReactNode;
}

export const Tooltip = ({ label, description, ...rest }: TooltipProps) => {
  return (
    <TooltipWrapper {...rest}>
      <Box>{label}</Box>
      <Box className="tooltip">{description}</Box>
    </TooltipWrapper>
  );
};
