import styled, { css, keyframes } from "styled-components";
import { useEmbed } from "../../../hooks";

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

export const Loader = styled.div(() => {
  const { settings } = useEmbed();

  return css`
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-top: 4px solid ${settings.theme.primary};
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: ${spin} 1.5s linear infinite;
    display: inline-block;
  `;
});
