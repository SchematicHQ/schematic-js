import styled, { css } from "styled-components";

const TEXT_BASE_SIZE = 16;

export const Flex = styled.div<{
  $flexDirection?: string;
  $flexBasis?: string;
  $justifyContent?: string;
  $alignItems?: string;
  $gap?: string;
  $width?: string;
}>`
  display: flex;
  ${({ $flexDirection }) =>
    $flexDirection &&
    css`
      flex-direction: ${$flexDirection};
    `};
  ${({ $flexBasis }) =>
    $flexBasis &&
    css`
      flex-basis: ${$flexBasis};
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
    $gap &&
    css`
      gap: ${$gap};
    `};
  ${({ $width }) =>
    $width &&
    css`
      width: ${$width};
    `};
`;

export const BlockText = styled(Flex)<{
  $font?: string;
  $size?: number;
  $weight?: number;
  $color?: string;
  $textAlign?: string;
  $margin?: string;
}>`
  font-family: ${({ $font = "Inter" }) => `${$font}, sans-serif`};
  font-size: ${({ $size = 16 }) => `${$size / TEXT_BASE_SIZE}rem`};
  font-weight: ${({ $weight = 400 }) => $weight};
  line-height: 1.25;
  ${({ $textAlign }) => $textAlign && `text-align: ${$textAlign}`};
  ${({ $margin }) => $margin && `margin: ${$margin}`};
  color: ${({ $color, theme }) => $color || theme.text};
`;
