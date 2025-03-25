import styled, { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import type { ComponentProps } from "../../../types";
import { attr } from "../../../utils";
import { Box, type BoxProps } from "..";

export enum TextPropNames {
  Align = "$align",
  Font = "$font",
  Size = "$size",
  Weight = "$weight",
  Color = "$color",
  Leading = "$leading",
}

export type TextPropNameTypes = `${TextPropNames}`;

export interface TextProps extends BoxProps {
  $align?: ComponentProps["$textAlign"];
  $font?: ComponentProps["$fontFamily"];
  $size?: ComponentProps["$fontSize"];
  $weight?: ComponentProps["$fontWeight"];
  $color?: ComponentProps["$color"];
  $leading?: ComponentProps["$lineHeight"];
}

export const Text = styled(Box).attrs(({ as = "span", onClick }) => ({
  as,
  ...(onClick && { tabIndex: 0 }),
}))<TextProps>`
  ${({ $font }) =>
    $font &&
    css`
      font-family: ${$font}, sans-serif;
    `};
  ${({ $size }) =>
    typeof $size !== "undefined" &&
    css`
      font-size: ${typeof $size === "number"
        ? `${$size / TEXT_BASE_SIZE}rem`
        : $size};
    `};
  ${({ $weight }) =>
    typeof $weight !== "undefined" &&
    css`
      font-weight: ${$weight};
      font-variation-settings: "wght" ${$weight};
    `};
  ${({ $leading }) => attr("line-height", $leading)};
  ${({ $align }) => attr("text-align", $align)};
  color: ${({ $color, theme }) => $color || theme.typography.text.color};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }

  ${({ onClick }) =>
    onClick &&
    css`
      &:hover {
        cursor: pointer;
        text-decoration: underline;
      }
    `}
`;
