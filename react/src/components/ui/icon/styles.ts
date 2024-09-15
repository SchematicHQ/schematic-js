import styled, { css } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { hexToHSL } from "../../../utils";

export const Icon = styled.i`
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const Container = styled.div<{
  $size: "tn" | "sm" | "md" | "lg";
  $variant: "outline" | "filled";
  $colors: [string, string];
}>`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  border-radius: 9999px;

  filter: brightness(0.94);

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
