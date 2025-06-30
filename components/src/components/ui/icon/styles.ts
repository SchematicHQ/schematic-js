import { Icon as SchematicIcon } from "@schematichq/schematic-icons";
import styled, { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";

import { type IconProps } from "./Icon";

export interface StyledIconProps {
  name?: IconProps["name"];
  $variant: IconProps["variant"];
  $size: IconProps["size"];
  $color: IconProps["color"];
  $background: IconProps["background"];
  $rounded: IconProps["rounded"];
}

export const Icon = styled(SchematicIcon).attrs(({ name, title, onClick }) => ({
  title: title || name,
  ...(onClick && { tabIndex: 0 }),
}))<StyledIconProps>`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;

  ${({ onClick }) =>
    onClick &&
    css`
      &:hover {
        cursor: pointer;
      }
    `}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }

  ${({ $rounded }) =>
    $rounded &&
    css`
      border-radius: 9999px;
    `}

  ${({ $size, $rounded }) => {
    const base = TEXT_BASE_SIZE;
    let scale = 1.0;

    switch ($size) {
      case "tn":
        scale *= 1;
        break;
      case "sm":
        scale *= 1.25;
        break;
      case "md":
      default:
        scale *= 1.5;
        break;
      case "lg":
        scale *= 1.75;
        break;
      case "xl":
        scale *= 2;
        break;
      case "2xl":
        scale *= 2.5;
        break;
      case "3xl":
        scale *= 3;
        break;
    }

    return css`
      font-size: ${(base * scale) / TEXT_BASE_SIZE}rem;

      ${$rounded &&
      css`
        width: ${(base * (11 / 6) * scale) / TEXT_BASE_SIZE}rem;
        height: ${(base * (11 / 6) * scale) / TEXT_BASE_SIZE}rem;
      `}
    `;
  }}

  ${({ $variant, $color, $background }) => {
    return $variant === "outline"
      ? css`
          color: ${$color};
          background-color: transparent;
        `
      : css`
          color: ${$color};
          background-color: ${$background};
        `;
  }}
`;
