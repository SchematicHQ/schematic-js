import React from "react";
import { useTheme } from "styled-components";
import { Box } from "../box";
import { TEXT_BASE_SIZE } from "../../../const";
import { TooltipWrapper } from "./styles";

interface TooltipProps {
  label: string;
  description: string;
}

export const Tooltip = ({ label, description }: TooltipProps) => {
  const theme = useTheme();

  return (
    <TooltipWrapper>
      <Box>{label}</Box>

      <Box
        $position="absolute"
        $width="100%"
        $marginBottom=".5rem"
        $left="50%"
        $bottom="100%"
        $transform="translateX(-50%)"
        $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
        $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
        $backgroundColor={`${theme.card.background}`}
        $color={`${theme.typography.text.color}`}
        $padding={`${theme.card.padding / TEXT_BASE_SIZE / 2}rem`}
        className="tooltip"
        $opacity="0"
        $visibility="hidden"
      >
        {description}
      </Box>
    </TooltipWrapper>
  );
};
