import styled, { css, keyframes } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
`;

export const Loader = styled.div<{
  $size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  $color?: string;
  $isLoading?: boolean;
}>`
  display: inline-block;
  border-style: solid;
  border-color: hsla(0, 0%, 50%, 0.125);
  border-top-color: ${({ theme, $color }) => $color || theme.primary};
  border-radius: 50%;
  transition: all 0.1s;
  animation: ${spin} 1.5s linear infinite;

  ${({ $size = "md", $isLoading = true }) => {
    let px: number;
    switch ($size) {
      case "xs":
        px = 16;
        break;
      case "sm":
        px = 24;
        break;
      default:
      case "md":
        px = 32;
        break;
      case "lg":
        px = 40;
        break;
      case "xl":
        px = 48;
        break;
      case "2xl":
        px = 56;
        break;
      case "3xl":
        px = 64;
        break;
    }

    return css`
      width: ${($isLoading ? px : 0) / TEXT_BASE_SIZE}rem;
      height: ${($isLoading ? px : 0) / TEXT_BASE_SIZE}rem;
      border-width: ${($isLoading ? px : 0) / 16 / TEXT_BASE_SIZE}rem;
    `;
  }}
`;
