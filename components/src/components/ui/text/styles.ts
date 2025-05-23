import styled, { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import { type FontStyle } from "../../../context";
import type { ComponentProps } from "../../../types";

export enum TextPropNames {
  Font = "$font",
  Size = "$size",
  Weight = "$weight",
  Color = "$color",
  Leading = "$leading",
  Align = "$align",
}

export type TextPropNameTypes = `${TextPropNames}`;

export interface TextProps {
  display?: FontStyle;
  $width?: ComponentProps["$width"];
  $font?: ComponentProps["$fontFamily"];
  $size?: ComponentProps["$fontSize"];
  $weight?: ComponentProps["$fontWeight"];
  $color?: ComponentProps["$color"];
  $leading?: ComponentProps["$lineHeight"];
  $align?: ComponentProps["$textAlign"];
}

export const Text = styled.span
  .withConfig({
    shouldForwardProp: (prop) => prop !== "display",
  })
  .attrs(({ onClick }) => ({
    ...(onClick && { tabIndex: 0 }),
  }))<TextProps>(
  ({
    display = "text",
    theme,
    onClick,
    $font,
    $width,
    $size,
    $weight,
    $color,
    $leading = 1.35,
    $align,
  }) => {
    const fontStyle = theme.typography[display];
    const fontFamily = $font || fontStyle.fontFamily;
    const fontSize = $size || fontStyle.fontSize;
    const fontWeight = $weight || fontStyle.fontWeight;
    const color = $color || fontStyle.color;

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

      ${$width &&
      css`
        width: ${$width};
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
