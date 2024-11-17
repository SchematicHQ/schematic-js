import { Box } from "../../ui";
import { TooltipWrapper } from "./styles";

interface TooltipProps {
  label: React.ReactNode;
  description: React.ReactNode;
}

export const Tooltip = ({ label, description }: TooltipProps) => {
  return (
    <TooltipWrapper>
      <Box>{label}</Box>
      <Box className="tooltip">{description}</Box>
    </TooltipWrapper>
  );
};
