import styled, { css } from "styled-components";
import { Button as UIButton } from "../button";
import { Container as UIContainer } from "../styles";

export const Container = styled(UIContainer)`
  ${({ $minWidth = 542 }) => css`
    min-width: ${$minWidth}px;
  `};
  padding: ${40 / 16}rem ${50 / 16}rem;
`;

export const Button = styled(UIButton)<{
  $size?: "sm" | "md" | "lg";
  $color?: string;
  $backgroundColor?: string;
}>`
  font-family: "Public Sans", sans-serif;
  font-weight: 500;
  text-align: center;
  width: 100%;
  color: ${({ $color, theme }) => $color || theme.text};
  background-color: ${({ $backgroundColor, theme }) =>
    $backgroundColor || theme.button};

  ${({ $size = "md" }) => {
    switch ($size) {
      case "sm":
        return css`
          font-size: ${15 / 16}rem;
          padding: ${12 / 16}rem 0;
          border-radius: ${8 / 16}rem;
        `;
      case "md":
        return css`
          font-size: ${17 / 16}rem;
          padding: ${16 / 16}rem 0;
          border-radius: ${10 / 16}rem;
        `;
      case "lg":
        return css`
          font-size: ${19 / 16}rem;
          padding: ${20 / 16}rem 0;
          border-radius: ${12 / 16}rem;
        `;
    }
  }}
`;
