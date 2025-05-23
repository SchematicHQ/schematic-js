import styled from "styled-components";

export const Container = styled.div`
  height: auto;
  opacity: 1;
  transition: 0.1s;

  @starting-style {
    height: 0;
    opacity: 0;
  }
`;
