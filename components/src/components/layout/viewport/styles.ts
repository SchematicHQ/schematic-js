import styled, { css } from "styled-components";

export const StyledViewport = styled.div.withConfig({
  shouldForwardProp: (prop) =>
    !["$numberOfColumns", "numberOfColumns"].includes(prop),
})`
  display: grid;
  margin-left: auto;
  margin-right: auto;
  gap: 1rem;

  @container (max-width: 767px) {
    grid-template-columns: repeat(1, minmax(300px, 1fr));
  }

  @container (min-width: 768px) {
    grid-template-columns: ${({ theme }) =>
      css`repeat(${theme.numberOfColumns}, minmax(300px, 1fr))`};
  }
`;
