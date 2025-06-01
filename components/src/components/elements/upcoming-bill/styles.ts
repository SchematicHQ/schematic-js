import styled from "styled-components";

export const Container = styled.div`
  height: auto;
  opacity: 1;
  transition:
    height 0.1s ease-in,
    opacity 0.1s ease-out;

  @starting-style {
    height: 0;
    opacity: 0;
  }
`;
