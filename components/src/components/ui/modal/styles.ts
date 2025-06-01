import styled, { css } from "styled-components";

import { Box } from "../../ui";

import { type ModalSize } from ".";

interface ModalProps {
  $size?: ModalSize;
}

export const Overlay = styled(Box)`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 999999;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  overflow: hidden;
  scrollbar-width: thin;
  scrollbar-gutter: stable both-edges;
  opacity: 1;
  transition: opacity 0.1s ease-out;

  &[data-closing] {
    opacity: 0;
  }

  @starting-style {
    opacity: 0;
  }
`;

export const Modal = styled(Box).attrs({
  role: "dialog",
  "aria-modal": true,
})<ModalProps>`
  position: relative;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(1);
  transform-origin: bottom center;
  flex-direction: column;
  overflow: auto;
  width: 100%;
  height: 100vh;
  background-color: ${({ theme }) => theme.card.background};
  box-shadow:
    0px 1px 20px 0px #1018280f,
    0px 1px 3px 0px #1018281a;
  opacity: 1;
  transition:
    transform 0.1s ease-in,
    opacity 0.1s ease-out;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
  }

  [data-closing] & {
    transform: translate(-50%, -50%) scale(0.975);
    opacity: 0;
  }

  @starting-style {
    transform: translate(-50%, -50%) scale(0.975);
    opacity: 0;
  }

  @media (min-width: 768px) {
    ${({ $size }) => {
      return css`
        width: ${$size === "auto" ? "fit-content" : "100%"};
        height: ${$size === "lg" ? "100%" : "fit-content"};
        max-width: ${$size === "sm"
          ? "480px"
          : $size === "md"
            ? "688px"
            : "1356px"};
        border-radius: 0.5rem;
      `;
    }}
  }

  @media (min-height: 896px) {
    max-height: 860px;
  }
`;
