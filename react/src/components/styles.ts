import styled, { css } from "styled-components";
import CSS from "csstype";

const TEXT_BASE_SIZE = 16;

export interface BoxProps {
  $align?: CSS.Property.TextAlign;
  $position?: CSS.Property.Position;
  $top?: CSS.Property.Top | number;
  $right?: CSS.Property.Right | number;
  $bottom?: CSS.Property.Bottom | number;
  $left?: CSS.Property.Left | number;
  $zIndex?: CSS.Property.ZIndex;
  $overflow?: CSS.Property.Overflow;
  $width?: CSS.Property.Width | number;
  $minWidth?: CSS.Property.MinWidth | number;
  $maxWidth?: CSS.Property.MaxWidth | number;
  $height?: CSS.Property.Height | number;
  $minHeight?: CSS.Property.MinHeight | number;
  $maxHeight?: CSS.Property.MaxHeight | number;
  $margin?: CSS.Property.Margin | number;
  $padding?: CSS.Property.Padding | number;
  $background?: CSS.Property.Background;
  $boxShadow?: CSS.Property.BoxShadow;
  $border?: CSS.Property.Border;
  $borderRadius?: CSS.Property.BorderRadius | "full" | number;
}

export const Box = styled.div<BoxProps>`
  ${({ $align }) =>
    $align &&
    css`
      text-align: ${$align};
    `};
  ${({ $position }) =>
    $position &&
    css`
      position: ${$position};
    `};
  ${({ $top }) =>
    typeof $top !== "undefined" &&
    css`
      top: ${typeof $top === "number" ? `${$top / TEXT_BASE_SIZE}rem` : $top};
    `};
  ${({ $right }) =>
    typeof $right !== "undefined" &&
    css`
      right: ${typeof $right === "number"
        ? `${$right / TEXT_BASE_SIZE}rem`
        : $right};
    `};
  ${({ $bottom }) =>
    typeof $bottom !== "undefined" &&
    css`
      bottom: ${typeof $bottom === "number"
        ? `${$bottom / TEXT_BASE_SIZE}rem`
        : $bottom};
    `};
  ${({ $left }) =>
    typeof $left !== "undefined" &&
    css`
      left: ${typeof $left === "number"
        ? `${$left / TEXT_BASE_SIZE}rem`
        : $left};
    `};
  ${({ $zIndex }) =>
    $zIndex &&
    css`
      z-index: ${$zIndex};
    `};
  ${({ $overflow }) =>
    $overflow &&
    css`
      overflow: ${$overflow};
    `};
  ${({ $width }) =>
    typeof $width !== "undefined" &&
    css`
      width: ${typeof $width === "number" ? `${$width}px` : $width};
    `};
  ${({ $minWidth }) =>
    typeof $minWidth !== "undefined" &&
    css`
      min-width: ${typeof $minWidth === "number"
        ? `${$minWidth}px`
        : $minWidth};
    `};
  ${({ $maxWidth }) =>
    typeof $maxWidth !== "undefined" &&
    css`
      max-width: ${typeof $maxWidth === "number"
        ? `${$maxWidth}px`
        : $maxWidth};
    `};
  ${({ $height }) =>
    typeof $height !== "undefined" &&
    css`
      height: ${typeof $height === "number" ? `${$height}px` : $height};
    `};
  ${({ $minHeight }) =>
    typeof $minHeight !== "undefined" &&
    css`
      min-height: ${typeof $minHeight === "number"
        ? `${$minHeight}px`
        : $minHeight};
    `};
  ${({ $maxHeight }) =>
    typeof $maxHeight !== "undefined" &&
    css`
      max-height: ${typeof $maxHeight === "number"
        ? `${$maxHeight}px`
        : $maxHeight};
    `};
  ${({ $margin }) =>
    typeof $margin !== "undefined" &&
    css`
      margin: ${typeof $margin === "number"
        ? `${$margin / TEXT_BASE_SIZE}rem`
        : $margin};
    `};
  ${({ $padding }) =>
    typeof $padding !== "undefined" &&
    css`
      padding: ${typeof $padding === "number"
        ? `${$padding / TEXT_BASE_SIZE}rem`
        : $padding};
    `};
  ${({ $background }) =>
    $background &&
    css`
      background: ${$background};
    `};
  ${({ $boxShadow }) =>
    $boxShadow &&
    css`
      box-shadow: ${$boxShadow};
    `};
  ${({ $border }) =>
    $border &&
    css`
      border: ${$border};
    `};
  ${({ $borderRadius }) =>
    typeof $borderRadius !== "undefined" &&
    css`
      border-radius: ${$borderRadius === "full"
        ? "9999px"
        : typeof $borderRadius === "number"
          ? `${$borderRadius / TEXT_BASE_SIZE}rem`
          : $borderRadius};
    `};
`;

export const Container = styled(Box)`
  box-sizing: border-box;
  font-size: ${TEXT_BASE_SIZE}px;
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background};

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }
`;

export interface FlexProps extends BoxProps {
  $direction?: CSS.Property.FlexDirection;
  $basis?: CSS.Property.FlexBasis;
  $justifyContent?: CSS.Property.JustifyContent;
  $alignItems?: CSS.Property.AlignItems;
  $gap?: CSS.Property.Gap | number;
}

export const Flex = styled(Box)<FlexProps>`
  display: flex;
  ${({ $direction }) =>
    $direction &&
    css`
      flex-direction: ${$direction};
    `};
  ${({ $basis }) =>
    $basis &&
    css`
      flex-basis: ${$basis};
    `};
  ${({ $justifyContent }) =>
    $justifyContent &&
    css`
      justify-content: ${$justifyContent};
    `};
  ${({ $alignItems }) =>
    $alignItems &&
    css`
      align-items: ${$alignItems};
    `};
  ${({ $gap }) =>
    typeof $gap !== "undefined" &&
    css`
      gap: ${typeof $gap === "number" ? `${$gap / TEXT_BASE_SIZE}rem` : $gap};
    `};
`;

export interface TextProps {
  $font?: CSS.Property.FontFamily;
  $size?: CSS.Property.FontSize | number;
  $weight?: CSS.Property.FontWeight;
  $color?: CSS.Property.Color;
}

export const Text = styled.span<TextProps>`
  font-family: ${({ $font = "Inter" }) => `${$font}, sans-serif`};
  font-size: ${({ $size = 16 }) =>
    typeof $size === "number" ? `${$size / TEXT_BASE_SIZE}rem` : $size};
  font-weight: ${({ $weight = 400 }) => $weight};
  line-height: 1.25;
  color: ${({ $color, theme }) => $color || theme.text};
`;

export interface FlexTextProps extends TextProps {}

export const FlexText = styled(Flex)<FlexTextProps>`
  font-family: ${({ $font = "Inter" }) => `${$font}, sans-serif`};
  font-size: ${({ $size = 16 }) =>
    typeof $size === "number" ? `${$size / TEXT_BASE_SIZE}rem` : $size};
  font-weight: ${({ $weight = 400 }) => $weight};
  line-height: 1.25;
  ${({ $margin }) => $margin && `margin: ${$margin}`};
  color: ${({ $color, theme }) => $color || theme.text};
`;
