import styled, { keyframes } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

export const Loader = styled.div`
  border: ${4 / TEXT_BASE_SIZE}rem solid hsla(0, 0%, 50%, 0.125);
  border-top: ${4 / TEXT_BASE_SIZE}rem solid ${({ theme }) => theme.primary};
  border-radius: 50%;
  width: ${56 / TEXT_BASE_SIZE}rem;
  height: ${56 / TEXT_BASE_SIZE}rem;
  animation: ${spin} 1.5s linear infinite;
  display: inline-block;
`;
