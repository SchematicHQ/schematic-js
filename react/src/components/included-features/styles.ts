import styled from "styled-components";
import { Container as UIContainer } from "../container";

export const Container = styled(UIContainer)`
  padding: ${40 / 16}rem ${50 / 16}rem;
  color: ${({ theme }) => theme.color};
  background: ${({ theme }) => theme.background};
  box-shadow:
    0px 1px 20px 0px #1018280f,
    0px 1px 3px 0px #1018281a;
`;
