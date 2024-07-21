import styled, { css } from "styled-components";

export const Button = styled.button<{
  $color: string;
  $size: "sm" | "md" | "lg";
  $variant: string;
}>`
  appearance: none;
  font-family: Manrope, Arial, Helvetica, sans-serif;
  font-weight: 800;
  line-height: 1;
  border: 1px solid transparent;
  transition-property: all;

  &:hover {
    cursor: pointer;
  }

  ${({ $size }) => {
    switch ($size) {
      case "sm":
        return css`
          font-size: ${12 / 16}rem;
          padding: ${7 / 16}rem ${20 / 16}rem;
          border-radius: ${4 / 16}rem;
        `;
      case "md":
      default:
        return css`
          font-size: ${14 / 16}rem;
          padding: ${8 / 16}rem ${24 / 16}rem;
          border-radius: ${8 / 16}rem;
        `;
      case "lg":
        return css`
          font-size: ${16 / 16}rem;
          padding: ${9 / 16}rem ${28 / 16}rem;
          border-radius: ${12 / 16}rem;
        `;
    }
  }}

  ${({ $color, $variant }) => {
    switch ($color) {
      case "blue":
      default: {
        const color = "#194bfb";
        return css`
          color: ${$variant === "outline" ? color : "#ffffff"};
          background-color: ${$variant === "outline" ? "transparent" : color};
          border-color: ${color};
        `;
      }

      case "red": {
        const color = "#ef4444";
        return css`
          color: ${$variant === "outline" ? color : "#ffffff"};
          background-color: ${$variant === "outline" ? "transparent" : color};
          border-color: ${color};
        `;
      }

      case "white": {
        const color = "#ffffff";
        return css`
          color: #000000;
          background-color: ${color};
          border-color: #000000;
        `;
      }

      case "black": {
        const color = "#000000";
        return css`
          color: #ffffff;
          background-color: ${color}
          border-color: ${color};
        `;
      }
    }
  }}

  &-disabled {
    color: #9ca3af80;
    background-color: #f9fafb;
    border-color: #f3f4f6;
    cursor: not-allowed;
  }
`;
