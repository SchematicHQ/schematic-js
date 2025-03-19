import styled from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { Box } from "../../ui";

export const Container = styled(Box)`
  all: initial;
  box-sizing: border-box;
  font-size: ${TEXT_BASE_SIZE}px;

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }

  sub,
  sup {
    position: static;
    line-height: 1;
  }

  sub {
    vertical-align: baseline;
  }

  sup {
    vertical-align: top;
  }
`;
