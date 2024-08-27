import styled from "styled-components";

export const StyledViewport = styled.div<{
  $numberOfColumns?: 1 | 2 | 3;
}>`
  display: grid;
  grid-template-columns: ${({ theme }) =>
    `repeat(${theme.numberOfColumns}, minmax(0, 1fr))`};
  place-content: start;
  gap: 1.5rem;
`;
