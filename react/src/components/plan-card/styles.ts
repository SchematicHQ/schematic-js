import styled, { css } from "styled-components";

export const Container = styled.div<{ $layout: "merged" | "separate" }>`
  ${({ $layout }) =>
    $layout === "merged"
      ? css`
          > :first-child {
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
          }

          > :last-child {
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
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
            border-radius: 8px;
          }
        `}
`;
