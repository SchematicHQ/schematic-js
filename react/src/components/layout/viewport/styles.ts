import styled from "styled-components";

export const StyledViewport = styled.div<{
  $numberOfColumns?: 1 | 2 | 3;
}>`
  display: flex;
  flex-wrap: wrap;
  place-content: start;
  margin-left: auto;
  margin-right: auto;
  gap: 1rem;
`;
