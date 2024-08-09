import styled, { css } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";

export const StyledCard = styled.div<{
  $sectionLayout?: "merged" | "separate";
  $borderRadius?: number;
  $color?: string;
  $padding?: number;
  $shadow?: boolean;
}>(
  ({
    theme,
    $sectionLayout = "merged",
    $borderRadius = 8,
    $padding = 48,
    $shadow = true,
  }) => {
    return css`
      box-sizing: border-box;
      font-size: ${TEXT_BASE_SIZE}px;

      *,
      *::before,
      *::after {
        box-sizing: inherit;
      }

      > * {
        padding: ${($padding * 0.75) / TEXT_BASE_SIZE}rem
          ${$padding / TEXT_BASE_SIZE}rem;
        color: ${theme.typography.text.color};
      }

      ${() => {
        const borderRadius = `${$borderRadius / TEXT_BASE_SIZE}rem`;
        const boxShadow =
          "0px 1px 20px 0px #1018280f, 0px 1px 3px 0px #1018281a";

        if ($sectionLayout === "merged") {
          return css`
            background: ${({ theme }) => theme.card.background};
            border-radius: ${borderRadius};

            ${$shadow && `box-shadow: ${boxShadow};`}

            > :not(:last-child) {
              border-bottom: 1px solid #eaeaea;
            }
          `;
        }

        return css`
          > :not(:last-child) {
            margin-bottom: 1rem;
          }

          > * {
            background: ${({ theme }) => theme.card.background};
            border-radius: ${borderRadius};
            ${$shadow && `box-shadow: ${boxShadow};`}
          }
        `;
      }}
    `;
  },
);
