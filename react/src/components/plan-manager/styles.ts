import styled, { css } from "styled-components";

export const Container = styled.div<{ $layout: "merged" | "separate" }>`
  width: 542px;
  overflow: hidden;
  box-shadow:
    0px 1px 20px 0px #1018280f,
    0px 1px 3px 0px #1018281a;

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
