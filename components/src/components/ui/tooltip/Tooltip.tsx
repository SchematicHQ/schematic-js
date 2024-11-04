import { useTheme } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { Box } from "../../ui";
import { TooltipWrapper } from "./styles";

interface TooltipProps {
  label?: string;
  description: string;
  position?: "left" | "center" | "right";
}

export const Tooltip = ({
  label,
  description,
  position = "left",
}: TooltipProps) => {
  const theme = useTheme();

  const positionMap = {
    left: {
      $left: "0",
      $transform: "translateX(0)",
    },
    center: {
      $left: "50%",
      $transform: "translateX(-50%)",
      $alignItems: "center",
      $top: "100%",
      $whiteSpace: "nowrap",
      $width: "auto",
      $display: "flex",
      $marginTop: ".75rem",
      $padding: `${theme.card.padding / TEXT_BASE_SIZE / 2.5}rem`,
    },
    right: {
      $right: "0",
      $alignItems: "center",
      $top: "100%",
      $width: "auto",
      $display: "flex",
      $marginTop: ".75rem",
      $whiteSpace: "nowrap",
    },
  };

  return (
    <TooltipWrapper>
      {label && <Box>{label}</Box>}

      <Box
        $position="absolute"
        $width="100%"
        $marginBottom=".5rem"
        $bottom="100%"
        $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
        $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
        $backgroundColor={`${theme.card.background}`}
        $color={`${theme.typography.text.color}`}
        $padding={`${theme.card.padding / TEXT_BASE_SIZE / 2}rem`}
        className="tooltip"
        $opacity="0"
        $visibility="hidden"
        {...positionMap[position]}
      >
        {description}
      </Box>
    </TooltipWrapper>
  );
};
