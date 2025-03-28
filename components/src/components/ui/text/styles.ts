import styled, { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import { type FontStyle } from "../../../context";
import type { ComponentProps } from "../../../types";
import { Box, type BoxProps } from "..";

export enum TextPropNames {
  Font = "$font",
  Size = "$size",
  Weight = "$weight",
  Color = "$color",
  Leading = "$leading",
  Align = "$align",
}

export type TextPropNameTypes = `${TextPropNames}`;

export interface TextProps extends BoxProps {
  display?: FontStyle;
  $font?: ComponentProps["$fontFamily"];
  $size?: ComponentProps["$fontSize"];
  $weight?: ComponentProps["$fontWeight"];
  $color?: ComponentProps["$color"];
  $leading?: ComponentProps["$lineHeight"];
  $align?: ComponentProps["$textAlign"];
}

export const Text = styled(Box)
  .withConfig({
    shouldForwardProp: (prop) => prop !== "display",
  })
  .attrs(({ as = "span", onClick }) => ({
    as,
    ...(onClick && { tabIndex: 0 }),
  }))<TextProps>(
  ({
    display = "text",
    theme,
    onClick,
    $font,
    $size,
    $weight,
    $color,
    $leading = 1.35,
    $align,
  }) => {
    const settings = theme.typography[display];
    const fontFamily = $font || settings.fontFamily;
    const fontSize = $size || settings.fontSize;
    const fontWeight = $weight || settings.fontWeight;
    const color = $color || settings.color;

    return css`
      font-family: ${fontFamily}, sans-serif;
      font-size: ${typeof fontSize === "number"
        ? `${fontSize / TEXT_BASE_SIZE}rem`
        : fontSize};
      font-weight: ${fontWeight};
      font-variation-settings: "wght" ${fontWeight};
      line-height: ${$leading};
      color: ${color};

      ${$align &&
      css`
        text-align: ${$align};
      `};

      ${onClick &&
      css`
        &:hover {
          cursor: pointer;
          text-decoration: underline;
        }
      `}

      &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.primary};
        outline-offset: 2px;
      }
    `;
  },
);
