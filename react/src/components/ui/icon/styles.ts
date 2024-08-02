import styled, { css } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";

export const Icon = styled.i`
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const Container = styled.div<{
  $size: "tn" | "sm" | "md" | "lg";
  $style: "outline" | "filled";
}>`
  display: flex;
  justify-content: center;
  align-items: center;
  border-width: 1px;
  border-style: solid;
  border-radius: 100%;
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
  ${({ $style }) =>
    $style === "outline"
      ? css`
          background-color: transparent;
          border-color: #d1d5db;
        `
      : css`
          background-color: #e5e7eb;
          border-color: #e5e7eb;
        `}
`;
