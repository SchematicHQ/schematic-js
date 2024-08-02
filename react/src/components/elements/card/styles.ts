import styled, { css } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";

export const StyledCard = styled.div<{
  $sectionLayout?: "merged" | "separate";
  $borderRadius?: number;
}>`
  box-sizing: border-box;
  font-size: ${TEXT_BASE_SIZE}px;

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }

  > * {
    padding: ${40 / TEXT_BASE_SIZE}rem ${50 / TEXT_BASE_SIZE}rem;
    color: ${({ theme }) => theme.text};
  }

  ${({ $sectionLayout = "merged", $borderRadius = 8 }) => {
    const borderRadius = `${$borderRadius / TEXT_BASE_SIZE}rem`;
    const boxShadow = "0px 1px 20px 0px #1018280f, 0px 1px 3px 0px #1018281a";

    if ($sectionLayout === "merged") {
      return css`
        background: ${({ theme }) => theme.card};
        border-radius: ${borderRadius};
        box-shadow: ${boxShadow};

        > :not(:last-child) {
          border-bottom: 1px solid #eaeaea;
        }
      `;
    }

    return css`
      > :not(:last-child) {
        margin-bottom: 2rem;
      }

      > * {
        background: ${({ theme }) => theme.card};
        border-radius: ${borderRadius};
        box-shadow: ${boxShadow};
      }
    `;
  }}
`;
