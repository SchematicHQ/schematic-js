import styled, { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import { hexToHSL } from "../../../utils";
import { Element, FussyChild } from "../../layout";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &:last-child {
    overflow: hidden;

    ${({ theme }) => {
      const borderRadius = `${theme.card.borderRadius / TEXT_BASE_SIZE}rem`;

      return css`
        border-bottom-left-radius: ${borderRadius};
        border-bottom-right-radius: ${borderRadius};
      `;
    }}
  }

  &:not(:last-child) {
    ${({ theme }) => {
      const { l } = hexToHSL(theme.card.background);
      const borderColor =
        l > 50 ? "hsla(0, 0%, 0%, 0.1)" : "hsla(0, 0%, 100%, 0.2)";

      return theme.sectionLayout === "merged"
        ? css`
            border-bottom: 1px solid ${borderColor};
          `
        : css`
            margin-bottom: 1rem;
          `;
    }}
  }

  ${({ theme }) => {
    return (
      theme.sectionLayout === "separate" &&
      css`
        ${Element}:not(:is(${FussyChild})) {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }
      `
    );
  }}
`;
