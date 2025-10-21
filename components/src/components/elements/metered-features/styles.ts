import { css, styled } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";

export const Container = styled.div`
  display: flex;
  flex-direction: column;

  &:last-child {
    ${({ theme }) => {
      const borderRadius = `${theme.card.borderRadius / TEXT_BASE_SIZE}rem`;

      return (
        theme.sectionLayout === "merged" &&
        css`
          overflow: hidden;
          border-bottom-left-radius: ${borderRadius};
          border-bottom-right-radius: ${borderRadius};
        `
      );
    }}
  }
`;
