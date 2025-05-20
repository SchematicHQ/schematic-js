import styled from "styled-components";

export const Container = styled.div`
  all: initial;
  box-sizing: border-box;
  display: block;
  font-size: 1rem;
  line-height: 1.35;
  width: 100%;
  height: 100%;
  container-type: inline-size;

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
