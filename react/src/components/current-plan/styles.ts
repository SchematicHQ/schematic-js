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
