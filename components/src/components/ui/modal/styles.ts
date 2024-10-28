import styled from "styled-components";
import { Box } from "..";

export const Container = styled(Box)`
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
