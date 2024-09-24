import styled from "styled-components";

export const StyledColumn = styled.div`
  flex-grow: 1;
  flex-basis: ${({ theme }) =>
    `calc(${100 / theme.numberOfColumns}% - ${(theme.numberOfColumns - 1) / theme.numberOfColumns}rem)`};
  height: min-content;
`;
