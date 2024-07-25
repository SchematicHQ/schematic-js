import styled from "styled-components";
import { TEXT_BASE_SIZE } from "../../const";
import { Box } from "../ui/box";

export const StyledContainer = styled(Box)`
  box-sizing: border-box;
  font-size: ${TEXT_BASE_SIZE}px;

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }
`;
