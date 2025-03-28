import styled from "styled-components";

import { Box } from "../../ui";

export const Container = styled(Box)`
  all: initial;
  box-sizing: border-box;
  display: block;
  font-size: 1rem;
  width: 100%;
  height: 100%;

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
