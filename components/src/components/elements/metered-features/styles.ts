import styled, { css } from "styled-components";

import { hexToHSL } from "../../../utils";
import { Flex } from "../../ui";

export const Container = styled(Flex)`
  flex-direction: column;

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
`;
