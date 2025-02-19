import { forwardRef } from "react";
import { cardBoxShadow, StyledCard, Element, FussyChild } from "./styles";
import { useEmbed } from "../../../hooks";
import { Flex, Loader } from "../../ui";
import { useTheme } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";

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
            $backgroundColor="rgba(0,0,0,.6)"
            $position="absolute"
            $left="0"
            $top="0"
            $width="100%"
            $height="100%"
            $alignItems="center"
            $justifyContent="center"
            $backdropFilter="blur(8px)"
            $zIndex="1"
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
