import { css, styled } from "styled-components";

export const ResetStyle = css`
  all: initial;
  box-sizing: border-box;
  display: block;
  font-size: 1rem;
  line-height: 1.35;
  width: 100%;
  height: auto;

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

export const ContainerStyle = css`
  container-type: inline-size;
  interpolate-size: allow-keywords;
`;

export const Container = styled.div`
  ${ResetStyle}
  ${ContainerStyle}
`;
