import styled from "styled-components";
import { Flex } from "../../ui";

export const StyledViewport = styled(Flex)<{
  $numberOfColumns?: 1 | 2 | 3;
}>`
  flex-wrap: wrap;
  place-content: start;
  margin-left: auto;
  margin-right: auto;
  gap: 2rem;
`;
