import styled from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { attr } from "../../../utils";
import type { ComponentProps } from "../../../types";

export interface TextProps extends ComponentProps {
  $align?: ComponentProps["$textAlign"];
  $font?: ComponentProps["$fontFamily"];
  $size?: ComponentProps["$fontSize"];
  $weight?: ComponentProps["$fontWeight"];
  $color?: ComponentProps["$color"];
}

export const Text = styled.span<TextProps>`
  font-family: ${({ $font = "Inter" }) => `${$font}, sans-serif`};
  font-size: ${({ $size = 16 }) =>
    typeof $size === "number" ? `${$size / TEXT_BASE_SIZE}rem` : $size};
  font-weight: ${({ $weight = 400 }) => $weight};
  line-height: 1.25;
  ${({ $align }) => attr("text-align", $align)};
  color: ${({ $color, theme }) => $color || theme.typography.text.color};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }
`;
