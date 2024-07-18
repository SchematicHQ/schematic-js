import styled, { css } from "styled-components";
import { Button as UIButton } from "../button";

const TEXT_BASE_SIZE = 16;

export const Container = styled.div<{
  $minWidth?: string;
}>`
  box-sizing: border-box;
  font-size: ${TEXT_BASE_SIZE}px;
  ${({ $minWidth = "542px" }) => css`
    min-width: ${$minWidth};
  `};
  padding: 40px 50px;
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background};

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }
`;

export const Flex = styled.div<{
  $flexDirection?: string;
  $justifyContent?: string;
  $alignItems?: string;
  $gap?: string;
  $width?: string;
}>`
  display: flex;
  flex-direction: ${({ $flexDirection = "row" }) => $flexDirection};
  justify-content: ${({ $justifyContent = "start" }) => $justifyContent};
  align-items: ${({ $alignItems = "start" }) => $alignItems};
  ${({ $gap }) => $gap && `gap: ${$gap}`};
  ${({ $width }) => $width && `width: ${$width}`};
`;

export const BlockText = styled.div<{
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

export const Button = styled(UIButton)<{
  $color?: string;
  $backgroundColor?: string;
}>`
  font-family: "Public Sans", sans-serif;
  font-size: ${17 / 16}rem;
  font-weight: 500;
  text-align: center;
  width: 100%;
  padding: 1rem 0;
  border-radius: 10px;
  color: ${({ $color, theme }) => $color || theme.text};
  background-color: ${({ $backgroundColor, theme }) =>
    $backgroundColor || theme.button};
`;
