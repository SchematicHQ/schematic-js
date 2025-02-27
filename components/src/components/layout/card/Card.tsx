import { forwardRef } from "react";
import { useTheme } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { hexToRGBA } from "../../../utils/color";
import { useEmbed } from "../../../hooks";
import { Flex, Loader } from "../../ui";
import { cardBoxShadow, StyledCard, Element, FussyChild } from "./styles";

export { cardBoxShadow, StyledCard, Element, FussyChild };

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export const Card = forwardRef<HTMLDivElement | null, CardProps>(
  ({ children, className }, ref) => {
    const { isPending } = useEmbed();
    const theme = useTheme();

    return (
      <StyledCard ref={ref} className={className}>
        {isPending && (
          <Flex
            $backgroundColor={hexToRGBA(theme.card.background, 0.8)}
            $position="absolute"
            $left="0"
            $top="0"
            $width="100%"
            $height="100%"
            $alignItems="center"
            $justifyContent="center"
            $backdropFilter="blur(8px)"
            $zIndex="3"
            $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
          >
            <Loader />
          </Flex>
        )}

        {children}
      </StyledCard>
    );
  },
);

Card.displayName = "Card";
