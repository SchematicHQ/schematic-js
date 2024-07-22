import styled from "styled-components";
import { TEXT_BASE_SIZE } from "../../const";
import { Box } from "../box";

export const Container = styled(Box)`
  box-sizing: border-box;
  font-size: ${TEXT_BASE_SIZE}px;
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background};

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }
`;
