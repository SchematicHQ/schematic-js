// import "@schematichq/schematic-icons/style.css";

import {
  Icon as SchematicIcon,
  iconsList,
  type IconNames,
  type IconProps,
} from "@schematichq/schematic-icons";
import styled, { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";

export { IconNames as IconNameTypes, IconProps, iconsList };

export const Icon = styled(SchematicIcon)<IconProps>`
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const IconContainer = styled.div<{
  $size: "tn" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  $variant: "outline" | "filled";
  $colors: [string, string];
}>`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  border-radius: 9999px;

  ${({ $size }) => {
    const base = 24;
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
      line-height: 1;
      width: ${((base + 8) * scale) / TEXT_BASE_SIZE}rem;
      height: ${((base + 8) * scale) / TEXT_BASE_SIZE}rem;
    `;
  }}

  ${({ $variant, $colors }) =>
    $variant === "outline"
      ? css`
          background-color: transparent;

          ${Icon} {
            color: ${$colors[0]};
          }
        `
      : css`
          background-color: ${$colors[1]};

          ${Icon} {
            color: ${$colors[0]};
          }
        `}
`;
