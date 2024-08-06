import styled, { css } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { DesignSettings } from "../../../types";

export const StyledCard = styled.div<{
  $sectionLayout?: "merged" | "separate";
  $borderRadius?: number;
  $borderWidth?: number;
  $boxPadding?: number;
  $design?: DesignSettings;
}>`
  box-sizing: border-box;
  font-size: ${TEXT_BASE_SIZE}px;

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }

  > * {
    padding: ${40 / 16}rem ${50 / 16}rem;
    color: ${({ theme }) => theme.color};
    background: ${({ theme }) => theme.background};
    box-shadow:
      0px 1px 20px 0px #1018280f,
      0px 1px 3px 0px #1018281a;
  }

  ${({ $sectionLayout = "merged", $borderRadius = 8 }) =>
    $sectionLayout === "merged"
      ? css`
          > :first-child {
            border-top-left-radius: ${$borderRadius / 16}rem;
            border-top-right-radius: ${$borderRadius / 16}rem;
          }

          > :last-child {
            border-bottom-left-radius: ${$borderRadius / 16}rem;
            border-bottom-right-radius: ${$borderRadius / 16}rem;
          }

          > :not(:last-child) {
            border-bottom: 1px solid #eaeaea;
          }
        `
      : css`
          > :not(:last-child) {
            margin-bottom: 2rem;
          }

          > * {
            border-radius: ${$borderRadius / 16}rem;
          }
        `}
`;
