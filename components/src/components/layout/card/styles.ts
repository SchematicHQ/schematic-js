import styled, { css } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import { hexToHSL } from "../../../utils";
import { Box } from "../../ui";

export const Element = styled(Box)``;

// instruct a parent `Card` to not apply styles
export const FussyChild = styled(Element)``;

export const Notice = styled(Box)``;

export const cardBoxShadow =
  "0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A";

export const StyledCard = styled.div(({ theme }) => {
  const { l } = hexToHSL(theme.card.background);
  const borderColor =
    l > 50 ? "hsla(0, 0%, 0%, 0.1)" : "hsla(0, 0%, 100%, 0.2)";
  const borderRadius = `${theme.card.borderRadius / TEXT_BASE_SIZE}rem`;

  return css`
    position: relative;

    ${theme.sectionLayout === "merged"
      ? `&:not(:has(${FussyChild}))`
      : `${Element}:not(:is(${FussyChild}))`} {
      color: ${theme.typography.text.color};
      background: ${theme.card.background};
      border-radius: ${borderRadius};
      ${theme.card.hasShadow && `box-shadow: ${cardBoxShadow};`}
    }

    ${Element}:not(:is(${FussyChild})) {
      padding: ${(theme.card.padding * 0.75) / TEXT_BASE_SIZE}rem
        ${theme.card.padding / TEXT_BASE_SIZE}rem;

      &:not(:last-child) {
        ${theme.sectionLayout === "merged"
          ? css`
              border-bottom: 1px solid ${borderColor};
            `
          : css`
              margin-bottom: 1rem;
            `}
      }
    }

    ${Notice}:first-child {
      border-top-left-radius: ${borderRadius};
      border-top-right-radius: ${borderRadius};
    }
  `;
});
