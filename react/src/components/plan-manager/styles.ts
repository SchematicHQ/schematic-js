import styled, { css } from "styled-components";
import { Button as UIButton } from "../button";

const TEXT_BASE_SIZE = 16;

export const Container = styled.div<{
  $maxWidth?: string;
}>`
  font-size: ${TEXT_BASE_SIZE}px;
  ${({ $maxWidth = "542px" }) => css`
    max-width: ${$maxWidth};
  `};
  padding: 40px 50px;
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background};
  border-radius: 8px;
  box-shadow:
    0px 1px 20px 0px #1018280f,
    0px 1px 3px 0px #1018281a;
`;

export const Flex = styled.div<{
  $flexDirection?: string;
  $justifyContent?: string;
  $alignItems?: string;
}>`
  display: flex;
  flex-direction: ${({ $flexDirection = "row" }) => $flexDirection};
  justify-content: ${({ $justifyContent = "center" }) => $justifyContent};
  align-items: ${({ $alignItems = "center" }) => $alignItems};
`;

export const BlockText = styled.div<{
  $font?: string;
  $size?: number;
  $weight?: number;
  $color?: string;
}>`
  font-family: ${({ $font = "Inter" }) => `${$font}, sans-serif`};
  font-size: ${({ $size = 16 }) => `${$size / TEXT_BASE_SIZE}rem`};
  font-weight: ${({ $weight = 400 }) => $weight};
  line-height: 1.25;
  color: ${({ $color, theme }) => $color || theme.text};
`;

export const Button = styled(UIButton)`
  width: 100%;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.button};
`;
