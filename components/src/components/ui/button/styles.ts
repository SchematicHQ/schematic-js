import styled, { css } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
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
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid transparent;

  &:hover {
    cursor: pointer;
  }

  ${({ $size, $variant }) => {
    switch ($size) {
      case "sm":
        return css`
          font-size: ${12 / TEXT_BASE_SIZE}rem;
          ${$variant !== "link" &&
          css`
            padding: ${7 / TEXT_BASE_SIZE}rem ${20 / TEXT_BASE_SIZE}rem;
          `}
          border-radius: ${4 / TEXT_BASE_SIZE}rem;
        `;
      case "md":
      default:
        return css`
          font-size: ${14 / TEXT_BASE_SIZE}rem;
          ${$variant !== "link" &&
          css`
            padding: ${8 / TEXT_BASE_SIZE}rem ${24 / TEXT_BASE_SIZE}rem;
          `}
          border-radius: ${8 / TEXT_BASE_SIZE}rem;
        `;
      case "lg":
        return css`
          font-size: ${16 / TEXT_BASE_SIZE}rem;
          ${$variant !== "link" &&
          css`
            padding: ${9 / TEXT_BASE_SIZE}rem ${28 / TEXT_BASE_SIZE}rem;
          `}
          border-radius: ${12 / TEXT_BASE_SIZE}rem;
        `;
    }
  }}

  ${({ $color, $variant }) => {
    let color = "#FFFFFF";
    let bgColor;
    switch ($color) {
      case "blue":
      default:
        bgColor = "#194BFB";
        break;
      case "red":
        bgColor = "#EF4444";
        break;
      case "white":
        color = "#000000";
        bgColor = "#FFFFFF";
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
    `;
  }}

  &-disabled {
    color: #9ca3af80;
    background-color: #f9fafb;
    border-color: #f3f4f6;
    cursor: not-allowed;
  }
`;
