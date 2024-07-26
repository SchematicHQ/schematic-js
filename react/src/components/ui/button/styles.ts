import styled, { css } from "styled-components";
import { Text } from "../text";
import {
  ButtonStyleTypes,
  ButtonSizeTypes,
  ButtonVariantTypes,
} from "./Button";

export const Button = styled.button<{
  $color: ButtonStyleTypes;
  $size: ButtonSizeTypes;
  $variant: ButtonVariantTypes;
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

  ${({ $size, $variant }) => {
    switch ($size) {
      case "sm":
        return css`
          font-size: ${12 / 16}rem;
          ${$variant !== "link" &&
          css`
            padding: ${7 / 16}rem ${20 / 16}rem;
          `}
          border-radius: ${4 / 16}rem;
        `;
      case "md":
      default:
        return css`
          font-size: ${14 / 16}rem;
          ${$variant !== "link" &&
          css`
            padding: ${8 / 16}rem ${24 / 16}rem;
          `}
          border-radius: ${8 / 16}rem;
        `;
      case "lg":
        return css`
          font-size: ${16 / 16}rem;
          ${$variant !== "link" &&
          css`
            padding: ${9 / 16}rem ${28 / 16}rem;
          `}
          border-radius: ${12 / 16}rem;
        `;
    }
  }}

  ${({ $color, $variant }) => {
    let color = "#ffffff";
    let bgColor;
    switch ($color) {
      case "blue":
      default:
        bgColor = "#194bfb";
        break;
      case "red":
        bgColor = "#ef4444";
        break;
      case "white":
        color = "#000000";
        bgColor = "#ffffff";
        break;
      case "black":
        bgColor = "#000000";
        break;
    }

    color = $variant === "ghost" || $variant === "link" ? bgColor : color;
    bgColor = $variant === "solid" ? bgColor : "transparent";
    const borderColor =
      $variant === "solid" || $variant === "outline" ? bgColor : "transparent";

    return css`
      color: ${color};
      background-color: ${bgColor};
      border-color: ${borderColor};

      ${Text} {
        color: ${color};
      }
    `;
  }}

  &-disabled {
    color: #9ca3af80;
    background-color: #f9fafb;
    border-color: #f3f4f6;
    cursor: not-allowed;
  }
`;
