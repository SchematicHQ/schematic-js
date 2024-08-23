import styled, { css } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { attr } from "../../../utils";
import type { ComponentProps } from "../../../types";

export interface TextProps extends ComponentProps {
  $align?: ComponentProps["$textAlign"];
  $font?: ComponentProps["$fontFamily"];
  $size?: ComponentProps["$fontSize"];
  $weight?: ComponentProps["$fontWeight"];
  $color?: ComponentProps["$color"];
  $lineHeight?: ComponentProps["$lineHeight"];
}

export const Text = styled.span<TextProps>`
  font-family: ${({ $font = "Inter" }) => `${$font}, sans-serif`};
  font-size: ${({ $size = 16 }) =>
    typeof $size === "number" ? `${$size / TEXT_BASE_SIZE}rem` : $size};
  ${({ $weight = 400 }) => css`
    font-weight: ${$weight};
    font-variation-settings: "wght" ${$weight};
  `};
  line-height: ${({ $lineHeight = 1.25 }) => $lineHeight};
  ${({ $align }) => attr("text-align", $align)};
  color: ${({ $color, theme }) => $color || theme.typography.text.color};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }
`;
