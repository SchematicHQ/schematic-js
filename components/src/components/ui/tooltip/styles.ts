import styled, { css, keyframes } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { Box, type BoxProps } from "../../ui";

export const Trigger = styled(Box)``;

interface ContentProps extends BoxProps {
  position: {
    x: number;
    y: number;
  };
  zIndex?: number;
}

export const grow = keyframes`
  0% {
    opacity: 0;
    transform: translate(-50%, -100%) scale(0);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -100%) scale(1);
  }
`;

export const Content = styled(Box).withConfig({
  shouldForwardProp: (prop) => !["position", "zIndex"].includes(prop),
})<ContentProps>`
    position: absolute;
    ${({ position }) => css`
      top: calc(${position.y}px - 0.75rem);
      left: ${position.x}px;
    `}
    transform: translate(-50%, -100%);
    z-index: ${({ zIndex = 1 }) => zIndex};
    line-height: 1;
    width: max-content;
    max-width: 100%;
    padding: ${1 / 1.15}rem 1rem;
    text-align: left;
    opacity: 0;
    background-color: ${({ theme }) => theme.card.background};
    border-radius: ${({ theme }) =>
      `${theme.card.borderRadius / TEXT_BASE_SIZE}rem`};
    filter: drop-shadow(0px 1px 20px #1018280f)
      drop-shadow(0px 1px 3px #1018281a);
    transform-origin: bottom center;
    animation: 0.2s ease-in-out 0.1s both ${grow};

    &::after {
      position: absolute;
      z-index: 0;
      top: 100%;
      left: 50%;
      transform: translate(-50%, -50%);
      content: "";
      display: block;
      width: 1rem;
      height: 1rem;
      clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
      background-color: ${({ theme }) => theme.card.background};
    }
  }
`;
